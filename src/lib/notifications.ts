'use client'

import { createClient } from '@/lib/supabase/client'

export interface Notification {
  id: string
  user_id: string
  type: 'session_request' | 'session_accepted' | 'session_declined' | 'message_received' | 'session_completed' | 'mentor_approved' | 'system_announcement' | 'reminder'
  title: string
  message: string
  data?: Record<string, any>
  read_at?: string
  expires_at?: string
  priority: number
  created_at: string
}

export interface CreateNotification {
  user_id: string
  type: Notification['type']
  title: string
  message: string
  data?: Record<string, any>
  expires_at?: string
  priority?: number
}

export class NotificationService {
  private supabase = createClient()

  async createNotification(notification: CreateNotification): Promise<Notification | null> {
    try {
      // Validate required fields
      if (!notification.user_id || !notification.type || !notification.title || !notification.message) {
        console.error('Missing required notification fields:', notification)
        return null
      }

      const { data, error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: notification.user_id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data || {},
          expires_at: notification.expires_at,
          priority: notification.priority || 1
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase error creating notification:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        console.error('Notification data:', notification)
        console.error('Full error object:', JSON.stringify(error, null, 2))
        return null
      }

      return data
    } catch (error) {
      console.error('Exception creating notification:', error)
      console.error('Notification data:', notification)
      return null
    }
  }

  async getNotifications(userId: string, limit = 50): Promise<Notification[]> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching notifications:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return []
    }
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .is('read_at', null)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching unread notifications:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching unread notifications:', error)
      return []
    }
  }

  async markAsRead(notificationIds: string[]): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', notificationIds)

      if (error) {
        console.error('Error marking notifications as read:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error marking notifications as read:', error)
      return false
    }
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null)

      if (error) {
        console.error('Error marking all notifications as read:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) {
        console.error('Error deleting notification:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting notification:', error)
      return false
    }
  }

  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    const channel = this.supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Notification)
        }
      )
      .subscribe()

    return () => {
      this.supabase.removeChannel(channel)
    }
  }

  // Helper methods for creating specific notification types
  async notifySessionRequest(mentorId: string, studentName: string, topic: string, sessionId: string) {
    return this.createNotification({
      user_id: mentorId,
      type: 'session_request',
      title: 'New Session Request',
      message: `${studentName} has requested a mentorship session about "${topic}"`,
      data: { session_id: sessionId, student_name: studentName, topic },
      priority: 2
    })
  }

  async notifySessionAccepted(studentId: string, mentorName: string, topic: string, sessionId: string) {
    return this.createNotification({
      user_id: studentId,
      type: 'session_accepted',
      title: 'Session Accepted!',
      message: `${mentorName} has accepted your session request about "${topic}"`,
      data: { session_id: sessionId, mentor_name: mentorName, topic },
      priority: 3
    })
  }

  async notifySessionDeclined(studentId: string, mentorName: string, topic: string, sessionId: string) {
    return this.createNotification({
      user_id: studentId,
      type: 'session_declined',
      title: 'Session Declined',
      message: `${mentorName} has declined your session request about "${topic}"`,
      data: { session_id: sessionId, mentor_name: mentorName, topic },
      priority: 2
    })
  }

  async notifyNewMessage(recipientId: string, senderName: string, sessionId: string, messagePreview: string) {
    console.log('Creating message notification:', { recipientId, senderName, sessionId, messagePreview })
    
    // Validate inputs
    if (!recipientId || !senderName || !sessionId || !messagePreview) {
      console.error('Invalid notification parameters:', { recipientId, senderName, sessionId, messagePreview })
      return null
    }
    
    const result = await this.createNotification({
      user_id: recipientId,
      type: 'message_received',
      title: 'New Message',
      message: `${senderName}: ${messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview}`,
      data: { session_id: sessionId, sender_name: senderName },
      priority: 1
    })
    
    console.log('Message notification result:', result)
    return result
  }

  async notifySessionCompleted(participantId: string, otherParticipantName: string, sessionId: string) {
    return this.createNotification({
      user_id: participantId,
      type: 'session_completed',
      title: 'Session Completed',
      message: `Your mentorship session with ${otherParticipantName} has been completed`,
      data: { session_id: sessionId, other_participant: otherParticipantName },
      priority: 2
    })
  }

  async notifyMentorApproved(userId: string) {
    return this.createNotification({
      user_id: userId,
      type: 'mentor_approved',
      title: 'Mentor Application Approved!',
      message: 'Congratulations! Your mentor application has been approved. You can now start accepting mentorship requests.',
      data: {},
      priority: 4
    })
  }

  async notifySystemAnnouncement(userIds: string[], title: string, message: string, data?: Record<string, any>) {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type: 'system_announcement' as const,
      title,
      message,
      data: data || {},
      priority: 3
    }))

    try {
      const { error } = await this.supabase
        .from('notifications')
        .insert(notifications)

      if (error) {
        console.error('Error creating system announcements:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error creating system announcements:', error)
      return false
    }
  }
}

export const notificationService = new NotificationService()