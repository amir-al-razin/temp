'use client'

import { createClient } from '@/lib/supabase/client'

export interface CalendarEvent {
  id?: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  location?: string
  attendees?: string[]
  sessionId?: string
  meetingUrl?: string
}

export interface TimeSlot {
  id: string
  mentorId: string
  startTime: Date
  endTime: Date
  isAvailable: boolean
  isRecurring?: boolean
  recurringPattern?: 'weekly' | 'daily' | 'monthly'
  sessionId?: string
}

export class CalendarService {
  private supabase = createClient()

  // Google Calendar Integration
  async connectGoogleCalendar(userId: string): Promise<boolean> {
    try {
      // Initialize Google Calendar API
      if (typeof window !== 'undefined' && window.gapi) {
        await window.gapi.load('auth2', () => {
          window.gapi.auth2.init({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
          })
        })

        const authInstance = window.gapi.auth2.getAuthInstance()
        const user = await authInstance.signIn({
          scope: 'https://www.googleapis.com/auth/calendar'
        })

        const accessToken = user.getAuthResponse().access_token

        // Store the access token securely
        const { error } = await this.supabase
          .from('user_calendar_integrations')
          .upsert({
            user_id: userId,
            provider: 'google',
            access_token: accessToken,
            refresh_token: user.getAuthResponse().refresh_token,
            expires_at: new Date(Date.now() + user.getAuthResponse().expires_in * 1000).toISOString(),
            connected_at: new Date().toISOString()
          })

        return !error
      }
      return false
    } catch (error) {
      console.error('Error connecting Google Calendar:', error)
      return false
    }
  }

  // Create calendar event
  async createCalendarEvent(userId: string, event: CalendarEvent): Promise<string | null> {
    try {
      // Get user's calendar integration
      const { data: integration } = await this.supabase
        .from('user_calendar_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .single()

      if (!integration) {
        throw new Error('No calendar integration found')
      }

      // Create event in Google Calendar
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: event.title,
          description: event.description,
          start: {
            dateTime: event.startTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: event.endTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          location: event.location,
          attendees: event.attendees?.map(email => ({ email })),
          conferenceData: event.meetingUrl ? {
            createRequest: {
              requestId: `eagles-${event.sessionId || Date.now()}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
          } : undefined
        })
      })

      const result = await response.json()
      
      if (result.id) {
        // Store event reference in our database
        await this.supabase
          .from('calendar_events')
          .insert({
            user_id: userId,
            session_id: event.sessionId,
            external_event_id: result.id,
            provider: 'google',
            title: event.title,
            start_time: event.startTime.toISOString(),
            end_time: event.endTime.toISOString(),
            meeting_url: result.hangoutLink || event.meetingUrl
          })

        return result.id
      }

      return null
    } catch (error) {
      console.error('Error creating calendar event:', error)
      return null
    }
  }

  // Get available time slots for a mentor
  async getMentorAvailability(mentorId: string, date: Date): Promise<TimeSlot[]> {
    try {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const { data: slots, error } = await this.supabase
        .from('mentor_availability')
        .select('*')
        .eq('mentor_id', mentorId)
        .gte('start_time', startOfDay.toISOString())
        .lte('end_time', endOfDay.toISOString())
        .eq('is_available', true)
        .order('start_time')

      if (error) throw error

      return slots || []
    } catch (error) {
      console.error('Error fetching mentor availability:', error)
      return []
    }
  }

  // Set mentor availability
  async setMentorAvailability(mentorId: string, slots: Omit<TimeSlot, 'id'>[]): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('mentor_availability')
        .upsert(
          slots.map(slot => ({
            mentor_id: mentorId,
            start_time: slot.startTime.toISOString(),
            end_time: slot.endTime.toISOString(),
            is_available: slot.isAvailable,
            is_recurring: slot.isRecurring || false,
            recurring_pattern: slot.recurringPattern
          }))
        )

      return !error
    } catch (error) {
      console.error('Error setting mentor availability:', error)
      return false
    }
  }

  // Book a time slot
  async bookTimeSlot(slotId: string, sessionId: string, studentId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('mentor_availability')
        .update({
          is_available: false,
          session_id: sessionId,
          booked_by: studentId,
          booked_at: new Date().toISOString()
        })
        .eq('id', slotId)

      return !error
    } catch (error) {
      console.error('Error booking time slot:', error)
      return false
    }
  }

  // Generate recurring availability
  async generateRecurringSlots(
    mentorId: string, 
    baseSlot: TimeSlot, 
    endDate: Date
  ): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = []
    const current = new Date(baseSlot.startTime)
    const slotDuration = baseSlot.endTime.getTime() - baseSlot.startTime.getTime()

    while (current <= endDate) {
      const slotEnd = new Date(current.getTime() + slotDuration)
      
      slots.push({
        id: `${mentorId}-${current.getTime()}`,
        mentorId,
        startTime: new Date(current),
        endTime: slotEnd,
        isAvailable: true,
        isRecurring: true,
        recurringPattern: baseSlot.recurringPattern
      })

      // Increment based on pattern
      switch (baseSlot.recurringPattern) {
        case 'daily':
          current.setDate(current.getDate() + 1)
          break
        case 'weekly':
          current.setDate(current.getDate() + 7)
          break
        case 'monthly':
          current.setMonth(current.getMonth() + 1)
          break
        default:
          return slots
      }
    }

    return slots
  }

  // Sync with external calendar
  async syncWithExternalCalendar(userId: string): Promise<boolean> {
    try {
      const { data: integration } = await this.supabase
        .from('user_calendar_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .single()

      if (!integration) return false

      // Fetch events from Google Calendar
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${integration.access_token}`
          }
        }
      )

      const data = await response.json()
      
      if (data.items) {
        // Update mentor availability based on external calendar
        const busySlots = data.items.map((event: any) => ({
          start_time: event.start.dateTime,
          end_time: event.end.dateTime,
          is_available: false,
          external_event_id: event.id
        }))

        // Mark conflicting slots as unavailable
        for (const busySlot of busySlots) {
          await this.supabase
            .from('mentor_availability')
            .update({ is_available: false })
            .eq('mentor_id', userId)
            .gte('start_time', busySlot.start_time)
            .lte('end_time', busySlot.end_time)
        }
      }

      return true
    } catch (error) {
      console.error('Error syncing with external calendar:', error)
      return false
    }
  }
}

export const calendarService = new CalendarService()

// Utility functions
export const formatTimeSlot = (slot: TimeSlot): string => {
  const start = slot.startTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  const end = slot.endTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  return `${start} - ${end}`
}

export const isSlotAvailable = (slot: TimeSlot, bookedSlots: TimeSlot[]): boolean => {
  return !bookedSlots.some(booked => 
    slot.startTime < booked.endTime && slot.endTime > booked.startTime
  )
}

export const generateTimeSlots = (
  startHour: number,
  endHour: number,
  duration: number = 60
): { hour: number; minute: number; label: string }[] => {
  const slots = []
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += duration) {
      if (hour === endHour - 1 && minute + duration > 60) break
      
      const time = new Date()
      time.setHours(hour, minute, 0, 0)
      
      slots.push({
        hour,
        minute,
        label: time.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      })
    }
  }
  
  return slots
}