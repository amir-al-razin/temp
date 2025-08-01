-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  department TEXT,
  year INTEGER,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Mentors table
CREATE TABLE mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  expertise_tags TEXT[],
  achievements TEXT,
  role_title TEXT,
  availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'offline')),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  mentor_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'scheduled', 'in_progress', 'completed')),
  topic TEXT NOT NULL,
  message TEXT,
  preferred_format TEXT DEFAULT 'chat' CHECK (preferred_format IN ('chat', 'video')),
  duration INTEGER DEFAULT 60,
  scheduled_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Feedback table
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) UNIQUE,
  student_id UUID REFERENCES profiles(id),
  mentor_id UUID REFERENCES profiles(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_mentors_status ON mentors(status);
CREATE INDEX idx_mentors_user_id ON mentors(user_id);
CREATE INDEX idx_sessions_student_id ON sessions(student_id);
CREATE INDEX idx_sessions_mentor_id ON sessions(mentor_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Row Level Security Policies

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Mentors policies
CREATE POLICY "Anyone can view approved mentors" ON mentors
  FOR SELECT USING (status = 'approved' OR user_id = auth.uid());

CREATE POLICY "Users can create own mentor application" ON mentors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mentor application" ON mentors
  FOR UPDATE USING (auth.uid() = user_id);

-- Sessions policies
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (auth.uid() = student_id OR auth.uid() = mentor_id);

CREATE POLICY "Students can create session requests" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Session participants can update sessions" ON sessions
  FOR UPDATE USING (auth.uid() = student_id OR auth.uid() = mentor_id);

-- Messages policies
CREATE POLICY "Users can view session messages" ON messages
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions 
      WHERE student_id = auth.uid() OR mentor_id = auth.uid()
    )
  );

CREATE POLICY "Session participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM sessions 
      WHERE student_id = auth.uid() OR mentor_id = auth.uid()
    )
  );

-- Feedback policies
CREATE POLICY "Users can view feedback for their sessions" ON feedback
  FOR SELECT USING (student_id = auth.uid() OR mentor_id = auth.uid());

CREATE POLICY "Students can create feedback for their sessions" ON feedback
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to handle session notifications
CREATE OR REPLACE FUNCTION public.handle_session_notifications()
RETURNS trigger AS $$
BEGIN
  -- Handle new session requests
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, message, data, priority)
    VALUES (
      NEW.mentor_id,
      'session_request',
      'New Session Request',
      'You have received a new mentorship session request for "' || NEW.topic || '"',
      json_build_object('session_id', NEW.id, 'topic', NEW.topic),
      2
    );
    RETURN NEW;
  END IF;

  -- Handle session status updates
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Session accepted
    IF NEW.status = 'accepted' THEN
      INSERT INTO public.notifications (user_id, type, title, message, data, priority)
      VALUES (
        NEW.student_id,
        'session_accepted',
        'Session Accepted!',
        'Your mentorship session request for "' || NEW.topic || '" has been accepted',
        json_build_object('session_id', NEW.id, 'topic', NEW.topic),
        3
      );
    END IF;

    -- Session declined
    IF NEW.status = 'declined' THEN
      INSERT INTO public.notifications (user_id, type, title, message, data, priority)
      VALUES (
        NEW.student_id,
        'session_declined',
        'Session Declined',
        'Your mentorship session request for "' || NEW.topic || '" has been declined',
        json_build_object('session_id', NEW.id, 'topic', NEW.topic),
        2
      );
    END IF;

    -- Session completed
    IF NEW.status = 'completed' THEN
      -- Notify student
      INSERT INTO public.notifications (user_id, type, title, message, data, priority)
      VALUES (
        NEW.student_id,
        'session_completed',
        'Session Completed',
        'Your mentorship session "' || NEW.topic || '" has been completed',
        json_build_object('session_id', NEW.id, 'topic', NEW.topic),
        2
      );
      
      -- Notify mentor
      INSERT INTO public.notifications (user_id, type, title, message, data, priority)
      VALUES (
        NEW.mentor_id,
        'session_completed',
        'Session Completed',
        'Your mentorship session "' || NEW.topic || '" has been completed',
        json_build_object('session_id', NEW.id, 'topic', NEW.topic),
        2
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle mentor approval notifications
CREATE OR REPLACE FUNCTION public.handle_mentor_notifications()
RETURNS trigger AS $$
BEGIN
  -- Handle mentor status updates
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Mentor approved
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, type, title, message, data, priority)
      VALUES (
        NEW.user_id,
        'mentor_approved',
        'Mentor Application Approved!',
        'Congratulations! Your mentor application has been approved. You can now start accepting mentorship requests.',
        json_build_object('mentor_id', NEW.id),
        4
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for automatic notifications
CREATE TRIGGER on_session_change
  AFTER INSERT OR UPDATE ON sessions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_session_notifications();

CREATE TRIGGER on_mentor_change
  AFTER UPDATE ON mentors
  FOR EACH ROW EXECUTE PROCEDURE public.handle_mentor_notifications();

-- Notifications table for comprehensive notification system
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN (
    'session_request', 'session_accepted', 'session_declined', 
    'message_received', 'session_completed', 'mentor_approved',
    'system_announcement', 'reminder'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMP,
  expires_at TIMESTAMP,
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT NOW()
);

-- User presence tracking
CREATE TABLE user_presence (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_seen TIMESTAMP DEFAULT NOW(),
  session_id UUID REFERENCES sessions(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Message delivery tracking
CREATE TABLE message_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_user_presence_status ON user_presence(status, updated_at);
CREATE INDEX idx_message_delivery_message ON message_delivery(message_id);

-- Enable RLS for new tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_delivery ENABLE ROW LEVEL SECURITY;

-- Notification policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Presence policies
CREATE POLICY "Users can view presence of session participants" ON user_presence
  FOR SELECT USING (
    user_id = auth.uid() OR
    user_id IN (
      SELECT CASE 
        WHEN student_id = auth.uid() THEN mentor_id
        WHEN mentor_id = auth.uid() THEN student_id
      END
      FROM sessions
      WHERE student_id = auth.uid() OR mentor_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own presence" ON user_presence
  FOR ALL USING (user_id = auth.uid());

-- Message delivery policies
CREATE POLICY "Users can view delivery status for their messages" ON message_delivery
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM messages WHERE sender_id = auth.uid()
    ) OR user_id = auth.uid()
  );

CREATE POLICY "System can track message delivery" ON message_delivery
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own delivery status" ON message_delivery
  FOR UPDATE USING (user_id = auth.uid());

-- Admins table for proper admin management
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) UNIQUE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  permissions TEXT[] DEFAULT ARRAY['manage_mentors', 'view_analytics', 'manage_users'],
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS for admins table
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can view all admin records" ON admins
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Super admins can manage admins" ON admins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );