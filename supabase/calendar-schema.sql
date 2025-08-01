-- Calendar Integration Schema
-- Run this in your Supabase SQL Editor

-- User calendar integrations table
CREATE TABLE user_calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'apple')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  connected_at TIMESTAMP DEFAULT NOW(),
  last_sync TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Mentor availability slots
CREATE TABLE mentor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  is_available BOOLEAN DEFAULT true,
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern TEXT CHECK (recurring_pattern IN ('daily', 'weekly', 'monthly')),
  recurring_end_date TIMESTAMP,
  session_id UUID REFERENCES sessions(id),
  booked_by UUID REFERENCES profiles(id),
  booked_at TIMESTAMP,
  external_event_id TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Calendar events table
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id),
  external_event_id TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'apple')),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location TEXT,
  meeting_url TEXT,
  attendees JSONB DEFAULT '[]',
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  is_synced BOOLEAN DEFAULT false,
  sync_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_event_time CHECK (end_time > start_time)
);

-- Session scheduling table
CREATE TABLE session_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  scheduled_start TIMESTAMP NOT NULL,
  scheduled_end TIMESTAMP NOT NULL,
  timezone TEXT NOT NULL,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMP,
  calendar_event_id UUID REFERENCES calendar_events(id),
  availability_slot_id UUID REFERENCES mentor_availability(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_schedule_time CHECK (scheduled_end > scheduled_start)
);

-- Notification preferences for calendar events
CREATE TABLE calendar_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email_reminders BOOLEAN DEFAULT true,
  email_reminder_minutes INTEGER[] DEFAULT ARRAY[15, 60, 1440], -- 15 min, 1 hour, 1 day
  push_reminders BOOLEAN DEFAULT true,
  push_reminder_minutes INTEGER[] DEFAULT ARRAY[15, 60],
  sync_external_calendar BOOLEAN DEFAULT true,
  auto_create_events BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_mentor_availability_mentor_time ON mentor_availability(mentor_id, start_time, end_time);
CREATE INDEX idx_mentor_availability_available ON mentor_availability(is_available, start_time) WHERE is_available = true;
CREATE INDEX idx_calendar_events_user_time ON calendar_events(user_id, start_time);
CREATE INDEX idx_calendar_events_session ON calendar_events(session_id);
CREATE INDEX idx_session_schedules_time ON session_schedules(scheduled_start, scheduled_end);
CREATE INDEX idx_user_calendar_integrations_active ON user_calendar_integrations(user_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE user_calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User calendar integrations
CREATE POLICY "Users can manage their own calendar integrations" ON user_calendar_integrations
  FOR ALL USING (user_id = auth.uid());

-- Mentor availability
CREATE POLICY "Mentors can manage their own availability" ON mentor_availability
  FOR ALL USING (mentor_id = auth.uid());

CREATE POLICY "Students can view mentor availability" ON mentor_availability
  FOR SELECT USING (is_available = true);

-- Calendar events
CREATE POLICY "Users can manage their own calendar events" ON calendar_events
  FOR ALL USING (user_id = auth.uid());

-- Session schedules
CREATE POLICY "Session participants can view schedules" ON session_schedules
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions 
      WHERE student_id = auth.uid() OR mentor_id = auth.uid()
    )
  );

CREATE POLICY "Session participants can create schedules" ON session_schedules
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM sessions 
      WHERE student_id = auth.uid() OR mentor_id = auth.uid()
    )
  );

CREATE POLICY "Session participants can update schedules" ON session_schedules
  FOR UPDATE USING (
    session_id IN (
      SELECT id FROM sessions 
      WHERE student_id = auth.uid() OR mentor_id = auth.uid()
    )
  );

-- Calendar notification preferences
CREATE POLICY "Users can manage their own notification preferences" ON calendar_notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Functions for calendar operations

-- Function to check for scheduling conflicts
CREATE OR REPLACE FUNCTION check_scheduling_conflict(
  p_mentor_id UUID,
  p_start_time TIMESTAMP,
  p_end_time TIMESTAMP,
  p_exclude_session_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM mentor_availability ma
    WHERE ma.mentor_id = p_mentor_id
    AND ma.is_available = false
    AND ma.start_time < p_end_time
    AND ma.end_time > p_start_time
    AND (p_exclude_session_id IS NULL OR ma.session_id != p_exclude_session_id)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate recurring availability
CREATE OR REPLACE FUNCTION generate_recurring_availability()
RETURNS TRIGGER AS $$
DECLARE
  slot_date DATE;
  end_date DATE;
  new_start TIMESTAMP;
  new_end TIMESTAMP;
  interval_days INTEGER;
BEGIN
  -- Only process if this is a recurring slot
  IF NEW.is_recurring AND NEW.recurring_pattern IS NOT NULL THEN
    -- Determine interval based on pattern
    CASE NEW.recurring_pattern
      WHEN 'daily' THEN interval_days := 1;
      WHEN 'weekly' THEN interval_days := 7;
      WHEN 'monthly' THEN interval_days := 30; -- Approximate
      ELSE RETURN NEW;
    END CASE;

    -- Set end date (default to 3 months if not specified)
    end_date := COALESCE(NEW.recurring_end_date::DATE, CURRENT_DATE + INTERVAL '3 months');
    slot_date := NEW.start_time::DATE + interval_days;

    -- Generate recurring slots
    WHILE slot_date <= end_date LOOP
      new_start := slot_date + (NEW.start_time::TIME);
      new_end := slot_date + (NEW.end_time::TIME);

      INSERT INTO mentor_availability (
        mentor_id, start_time, end_time, is_available, 
        is_recurring, recurring_pattern, recurring_end_date
      ) VALUES (
        NEW.mentor_id, new_start, new_end, true,
        true, NEW.recurring_pattern, NEW.recurring_end_date
      );

      slot_date := slot_date + interval_days;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-generating recurring availability
CREATE TRIGGER trigger_generate_recurring_availability
  AFTER INSERT ON mentor_availability
  FOR EACH ROW
  EXECUTE FUNCTION generate_recurring_availability();

-- Function to send calendar reminders
CREATE OR REPLACE FUNCTION send_calendar_reminders()
RETURNS void AS $$
DECLARE
  reminder_record RECORD;
BEGIN
  -- Find sessions that need reminders
  FOR reminder_record IN
    SELECT 
      ss.id as schedule_id,
      ss.session_id,
      ss.scheduled_start,
      s.student_id,
      s.mentor_id,
      s.topic
    FROM session_schedules ss
    JOIN sessions s ON ss.session_id = s.id
    WHERE ss.scheduled_start > NOW()
    AND ss.scheduled_start <= NOW() + INTERVAL '1 hour'
    AND ss.reminder_sent = false
  LOOP
    -- Create reminder notifications
    INSERT INTO notifications (user_id, type, title, message, data, priority)
    VALUES 
      (reminder_record.student_id, 'session_reminder', 'Session Reminder', 
       'Your mentorship session "' || reminder_record.topic || '" starts in 1 hour',
       json_build_object('session_id', reminder_record.session_id, 'scheduled_start', reminder_record.scheduled_start),
       3),
      (reminder_record.mentor_id, 'session_reminder', 'Session Reminder',
       'Your mentorship session "' || reminder_record.topic || '" starts in 1 hour',
       json_build_object('session_id', reminder_record.session_id, 'scheduled_start', reminder_record.scheduled_start),
       3);

    -- Mark reminder as sent
    UPDATE session_schedules 
    SET reminder_sent = true, reminder_sent_at = NOW()
    WHERE id = reminder_record.schedule_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to send reminders (you'll need to set this up in your deployment)
-- SELECT cron.schedule('send-calendar-reminders', '*/15 * * * *', 'SELECT send_calendar_reminders();');