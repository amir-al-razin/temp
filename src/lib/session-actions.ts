import { createClient } from './supabase/client'

export interface SessionAction {
  sessionId: string
  action: 'accept' | 'decline' | 'complete' | 'cancel'
  reason?: string
}

export interface SessionUpdate {
  status: 'requested' | 'accepted' | 'declined' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  updated_by: string
  metadata?: Record<string, any>
}

export class SessionManager {
  private supabase = createClient()

  async acceptSession(sessionId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('sessions')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('mentor_id', userId) // Only mentor can accept

    if (error) throw error

    // Create notification for student
    await this.createSessionNotification(sessionId, 'session_accepted')
  }

  async declineSession(sessionId: string, userId: string, reason?: string): Promise<void> {
    const { error } = await this.supabase
      .from('sessions')
      .update({
        status: 'declined',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('mentor_id', userId) // Only mentor can decline

    if (error) throw error

    // Create notification for student
    await this.createSessionNotification(sessionId, 'session_declined', { reason })
  }

  async completeSession(sessionId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .or(`student_id.eq.${userId},mentor_id.eq.${userId}`) // Either participant can complete

    if (error) throw error

    // Create notification for both participants
    await this.createSessionNotification(sessionId, 'session_completed')
  }

  async startSession(sessionId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('sessions')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .or(`student_id.eq.${userId},mentor_id.eq.${userId}`)

    if (error) throw error
  }

  private async createSessionNotification(
    sessionId: string, 
    type: string, 
    metadata?: Record<string, any>
  ): Promise<void> {
    // Get session details
    const { data: session } = await this.supabase
      .from('sessions')
      .select(`
        *,
        student:student_id(id, full_name),
        mentor:mentor_id(id, full_name)
      `)
      .eq('id', sessionId)
      .single()

    if (!session) return

    const notifications = []

    // Create notification based on type
    switch (type) {
      case 'session_accepted':
        notifications.push({
          user_id: session.student_id,
          type: 'session_accepted',
          title: 'Session Accepted!',
          message: `${session.mentor.full_name} has accepted your session request for "${session.topic}"`,
          data: { session_id: sessionId, mentor_name: session.mentor.full_name }
        })
        break

      case 'session_declined':
        notifications.push({
          user_id: session.student_id,
          type: 'session_declined',
          title: 'Session Declined',
          message: `${session.mentor.full_name} has declined your session request for "${session.topic}"`,
          data: { 
            session_id: sessionId, 
            mentor_name: session.mentor.full_name,
            reason: metadata?.reason 
          }
        })
        break

      case 'session_completed':
        notifications.push(
          {
            user_id: session.student_id,
            type: 'session_completed',
            title: 'Session Completed',
            message: `Your mentorship session "${session.topic}" has been completed`,
            data: { session_id: sessionId }
          },
          {
            user_id: session.mentor_id,
            type: 'session_completed',
            title: 'Session Completed',
            message: `Your mentorship session "${session.topic}" with ${session.student.full_name} has been completed`,
            data: { session_id: sessionId }
          }
        )
        break
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error } = await this.supabase
        .from('notifications')
        .insert(notifications)

      if (error) console.error('Error creating notifications:', error)
    }
  }

  async getSessionParticipants(sessionId: string) {
    const { data, error } = await this.supabase
      .from('sessions')
      .select(`
        student_id,
        mentor_id,
        student:student_id(id, full_name, avatar_url),
        mentor:mentor_id(id, full_name, avatar_url)
      `)
      .eq('id', sessionId)
      .single()

    if (error) throw error
    return data
  }
}