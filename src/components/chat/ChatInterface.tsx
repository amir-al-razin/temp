'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { notificationService } from '@/lib/notifications'
import { ArrowLeft, Send, Video, Clock, Paperclip } from 'lucide-react'
import Link from 'next/link'
import MessageBubble from './MessageBubble'
import type { Session, Message, User, ApiError } from '@/types'

interface ChatInterfaceProps {
  session: Session
  currentUser: User
  initialMessages: Message[]
}

export default function ChatInterface({
  session,
  currentUser,
  initialMessages
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const isStudent = session.student_id === currentUser.id
  const otherUser = isStudent ? session.mentor : session.student

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Set up real-time subscription with enhanced features
  useEffect(() => {
    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${session.id}`
        },
        async (payload) => {
          // Skip if this is our own message (already added optimistically)
          if (payload.new.sender_id === currentUser.id) return

          // Get sender information for the new message
          const { data: senderData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single()

          const newMessage = {
            ...payload.new,
            sender: senderData
          }

          setMessages(prev => [...prev, newMessage])

          // Mark message as delivered
          await supabase
            .from('message_delivery')
            .insert({
              message_id: payload.new.id,
              user_id: currentUser.id,
              delivered_at: new Date().toISOString()
            })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${session.id}`
        },
        (payload) => {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === payload.new.id
                ? { ...msg, ...payload.new }
                : msg
            )
          )
        }
      )
      .subscribe()

    // Update user presence
    const updatePresence = async () => {
      await supabase
        .from('user_presence')
        .upsert({
          user_id: currentUser.id,
          status: 'online',
          session_id: session.id,
          updated_at: new Date().toISOString()
        })
    }

    updatePresence()

    // Update presence every 30 seconds
    const presenceInterval = setInterval(updatePresence, 30000)

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel)
      clearInterval(presenceInterval)

      // Set user as offline
      supabase
        .from('user_presence')
        .upsert({
          user_id: currentUser.id,
          status: 'offline',
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      // Clean up Jitsi tracking if component unmounts
      const cleanup = (window as Record<string, unknown>)[`jitsi-cleanup-${session.id}`] as (() => void) | undefined
      if (cleanup) {
        cleanup()
        delete (window as Record<string, unknown>)[`jitsi-cleanup-${session.id}`]
      }

      // Remove user from call tracking
      localStorage.removeItem(`jitsi-user-${session.id}-${currentUser.id}`)
    }
  }, [session.id, currentUser.id, supabase])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || isLoading) return

    const messageContent = newMessage.trim()
    const tempId = `temp-${Date.now()}`

    // Optimistic update - add message immediately
    const optimisticMessage = {
      id: tempId,
      session_id: session.id,
      sender_id: currentUser.id,
      content: messageContent,
      message_type: 'text',
      created_at: new Date().toISOString(),
      sender: {
        id: currentUser.id,
        full_name: currentUser.user_metadata?.full_name || 'You',
        avatar_url: null
      },
      sending: true
    }

    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          session_id: session.id,
          sender_id: currentUser.id,
          content: messageContent,
          message_type: 'text'
        }])
        .select()
        .single()

      if (error) throw error

      // Replace optimistic message with real message
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId
            ? { ...data, sender: optimisticMessage.sender, sending: false }
            : msg
        )
      )

      // Update session status to in_progress if it's accepted
      if (session.status === 'accepted') {
        await supabase
          .from('sessions')
          .update({ status: 'in_progress' })
          .eq('id', session.id)
      }

      // Send notification to the other participant
      try {
        const isStudent = session.student_id === currentUser.id
        const recipientId = isStudent ? session.mentor_id : session.student_id
        const senderName = currentUser.user_metadata?.full_name || currentUser.email || 'Someone'

        if (recipientId && recipientId !== currentUser.id) {
          await notificationService.notifyNewMessage(
            recipientId,
            senderName,
            session.id,
            messageContent
          )
        }
      } catch (notificationError) {
        console.warn('Failed to send notification:', notificationError)
        // Don't fail the message sending if notification fails
      }

    } catch (err) {
      const error = err as Error
      // Remove failed message and show error
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      setNewMessage(messageContent) // Restore message content
      setError(error.message || 'Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${session.id}-${Date.now()}.${fileExt}`
      const filePath = `chat-files/${fileName}`

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath)

      // Send message with file
      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          session_id: session.id,
          sender_id: currentUser.id,
          content: file.name,
          message_type: 'file',
          file_url: publicUrl
        }])

      if (messageError) throw messageError

      // Update session status to in_progress if it's accepted
      if (session.status === 'accepted') {
        await supabase
          .from('sessions')
          .update({ status: 'in_progress' })
          .eq('id', session.id)
      }

    } catch (err) {
      const error = err as Error
      setError(error.message || 'Failed to upload file')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleVideoCall = async () => {
    try {
      // Generate unique Jitsi room name
      const roomName = `eagles-mentorship-${session.id}`
      const jitsiLink = `https://meet.jit.si/${roomName}`

      // Get participant names for better meeting experience
      const studentName = session.student?.full_name || 'Student'
      const mentorName = session.mentor?.full_name || 'Mentor'
      const currentUserName = currentUser.user_metadata?.full_name || 'User'

      // Store video call session info in localStorage for tracking
      const callSession = {
        sessionId: session.id,
        roomName,
        startedBy: currentUser.id,
        startedAt: new Date().toISOString(),
        participants: [
          { id: session.mentor_id, name: mentorName, role: 'mentor' },
          { id: session.student_id, name: studentName, role: 'student' }
        ]
      }
      localStorage.setItem(`jitsi-call-${session.id}`, JSON.stringify(callSession))

      // Send meeting link as message with different URLs for mentor and student
      const { error } = await supabase
        .from('messages')
        .insert([{
          session_id: session.id,
          sender_id: currentUser.id,
          content: `🎥 Video call started by ${currentUserName}`,
          message_type: 'system',
          metadata: {
            type: 'video_call',
            jitsi_room: roomName,
            jitsi_link: jitsiLink,
            mentor_link: `${jitsiLink}?userInfo.displayName=${encodeURIComponent(mentorName)}&userInfo.email=${encodeURIComponent(currentUser.email || '')}&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.enableWelcomePage=false&config.prejoinPageEnabled=false`,
            student_link: `${jitsiLink}?userInfo.displayName=${encodeURIComponent(studentName)}&config.startWithAudioMuted=true&config.startWithVideoMuted=true&config.enableWelcomePage=false&config.prejoinPageEnabled=false&config.readOnlyName=true`,
            started_by: currentUser.id,
            mentor_id: session.mentor_id,
            student_id: session.student_id,
            participants: [studentName, mentorName],
            call_active: true,
            call_session_id: `jitsi-call-${session.id}`
          }
        }])

      if (error) throw error

      // Open Jitsi meeting as moderator (mentor)
      // The mentor joins first and automatically becomes moderator
      const mentorJitsiUrl = new URL(jitsiLink)

      // Mentor configuration - optimized for moderator experience
      mentorJitsiUrl.searchParams.set('config.startWithAudioMuted', 'false')
      mentorJitsiUrl.searchParams.set('config.startWithVideoMuted', 'false')
      mentorJitsiUrl.searchParams.set('config.enableWelcomePage', 'false')
      mentorJitsiUrl.searchParams.set('config.prejoinPageEnabled', 'false')
      mentorJitsiUrl.searchParams.set('config.toolbarButtons', JSON.stringify([
        'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
        'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
        'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
        'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
        'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone'
      ]))
      mentorJitsiUrl.searchParams.set('userInfo.displayName', mentorName)
      mentorJitsiUrl.searchParams.set('userInfo.email', currentUser.email || '')

      // Open Jitsi and track the window
      const jitsiWindow = window.open(mentorJitsiUrl.toString(), '_blank', 'width=1200,height=800')

      // Enhanced Jitsi window tracking for both participants
      if (jitsiWindow) {
        // Track when user joins the call
        const userJoinData = {
          userId: currentUser.id,
          userName: currentUserName,
          role: isStudent ? 'student' : 'mentor',
          joinedAt: new Date().toISOString(),
          windowOpen: true
        }

        // Store user's join status
        localStorage.setItem(`jitsi-user-${session.id}-${currentUser.id}`, JSON.stringify(userJoinData))

        // Monitor if the Jitsi window is closed
        const checkClosed = setInterval(() => {
          if (jitsiWindow.closed) {
            clearInterval(checkClosed)
            handleUserLeftCall()
          }
        }, 1000)

        // Store the interval ID for cleanup
        localStorage.setItem(`jitsi-monitor-${session.id}`, checkClosed.toString())

        // Listen for storage changes (when other participant joins/leaves)
        const handleStorageChange = (e: StorageEvent) => {
          if (e.key?.startsWith(`jitsi-user-${session.id}-`) && e.newValue === null) {
            // Another user left the call, check if all users have left
            setTimeout(checkIfAllUsersLeft, 500) // Small delay to ensure localStorage is updated
          }
        }

        window.addEventListener('storage', handleStorageChange)

          // Store cleanup function reference
          ; (window as Record<string, unknown>)[`jitsi-cleanup-${session.id}`] = () => {
            clearInterval(checkClosed)
            window.removeEventListener('storage', handleStorageChange)
            localStorage.removeItem(`jitsi-monitor-${session.id}`)
          }
      }

    } catch (err) {
      const error = err as Error
      setError(error.message || 'Failed to start video call')
    }
  }

  const handleUserLeftCall = async () => {
    try {
      // Remove user's join status from localStorage
      localStorage.removeItem(`jitsi-user-${session.id}-${currentUser.id}`)

      // Check if all users have left after a short delay
      setTimeout(checkIfAllUsersLeft, 1000)
    } catch (err) {
      console.error('Error handling user left call:', err)
    }
  }

  const checkIfAllUsersLeft = async () => {
    try {
      // Check if any users are still in the call
      const mentorKey = `jitsi-user-${session.id}-${session.mentor_id}`
      const studentKey = `jitsi-user-${session.id}-${session.student_id}`

      const mentorInCall = localStorage.getItem(mentorKey)
      const studentInCall = localStorage.getItem(studentKey)

      // If no users are in the call, end it automatically
      if (!mentorInCall && !studentInCall) {
        await handleEndVideoCall()
      }
    } catch (err) {
      console.error('Error checking if all users left:', err)
    }
  }

  const handleEndVideoCall = async () => {
    try {
      const currentUserName = currentUser.user_metadata?.full_name || 'User'

      // Get call session info from localStorage
      const callSessionData = localStorage.getItem(`jitsi-call-${session.id}`)
      let callDuration = ''

      if (callSessionData) {
        const callSession = JSON.parse(callSessionData)
        const startTime = new Date(callSession.startedAt)
        const endTime = new Date()
        const durationMs = endTime.getTime() - startTime.getTime()
        const durationMinutes = Math.floor(durationMs / (1000 * 60))
        const durationHours = Math.floor(durationMinutes / 60)
        const remainingMinutes = durationMinutes % 60

        if (durationHours > 0) {
          callDuration = `${durationHours}h ${remainingMinutes}m`
        } else {
          callDuration = `${durationMinutes}m`
        }

        // Clean up localStorage
        localStorage.removeItem(`jitsi-call-${session.id}`)
      }

      // Clean up monitoring interval
      const monitorId = localStorage.getItem(`jitsi-monitor-${session.id}`)
      if (monitorId) {
        clearInterval(parseInt(monitorId))
        localStorage.removeItem(`jitsi-monitor-${session.id}`)
      }

      // Send video call end message with duration
      const { error } = await supabase
        .from('messages')
        .insert([{
          session_id: session.id,
          sender_id: currentUser.id,
          content: `📞 Video call ended by ${currentUserName}${callDuration ? ` (Duration: ${callDuration})` : ''}`,
          message_type: 'system',
          metadata: {
            type: 'video_call_ended',
            ended_by: currentUser.id,
            ended_at: new Date().toISOString(),
            call_duration: callDuration,
            call_session_id: `jitsi-call-${session.id}`
          }
        }])

      if (error) throw error

    } catch (err) {
      const error = err as Error
      setError(error.message || 'Failed to end video call')
    }
  }

  const handleCompleteSession = async () => {
    try {
      const currentUserName = currentUser.user_metadata?.full_name || 'User'
      const sessionStartTime = new Date(session.created_at)
      const sessionEndTime = new Date()
      const durationMs = sessionEndTime.getTime() - sessionStartTime.getTime()
      const durationMinutes = Math.floor(durationMs / (1000 * 60))
      const durationHours = Math.floor(durationMinutes / 60)
      const remainingMinutes = durationMinutes % 60

      let durationText = ''
      if (durationHours > 0) {
        durationText = `${durationHours}h ${remainingMinutes}m`
      } else {
        durationText = `${durationMinutes}m`
      }

      // Send session completion message
      await supabase
        .from('messages')
        .insert([{
          session_id: session.id,
          sender_id: currentUser.id,
          content: `🎓 Session completed by ${currentUserName}`,
          message_type: 'system',
          metadata: {
            type: 'session_completed',
            completed_by: currentUser.id,
            completed_at: sessionEndTime.toISOString(),
            duration_minutes: durationMinutes,
            duration_text: durationText,
            session_summary: {
              started_at: session.created_at,
              ended_at: sessionEndTime.toISOString(),
              total_duration: durationText,
              topic: session.topic,
              participants: [session.student?.full_name, session.mentor?.full_name]
            }
          }
        }])

      // Update session status
      const { error } = await supabase
        .from('sessions')
        .update({
          status: 'completed',
          completed_at: sessionEndTime.toISOString()
        })
        .eq('id', session.id)

      if (error) throw error

      router.push('/sessions')
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Failed to complete session')
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-blue-100 text-blue-800'
      case 'scheduled':
        return 'bg-purple-100 text-purple-800'
      case 'in_progress':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <Card className="rounded-none border-x-0 border-t-0 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/sessions">
                <Button variant="ghost" size="sm" className="hover:bg-muted">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>

              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={otherUser?.avatar_url || undefined}
                  alt={otherUser?.full_name || 'User'}
                />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {getInitials(otherUser?.full_name || 'User')}
                </AvatarFallback>
              </Avatar>

              <div>
                <CardTitle className="text-lg text-foreground">
                  {otherUser?.full_name}
                </CardTitle>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>{session.topic}</span>
                  <Badge
                    className={`text-xs ${getStatusColor(session.status)}`}
                    variant="secondary"
                  >
                    {session.status === 'in_progress' ? 'Active' : session.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Only mentors can start video calls */}
              {!isStudent && session.status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVideoCall}
                  disabled={session.status === 'completed'}
                  className="hover:bg-muted"
                  title="Start video call (Mentor only)"
                >
                  <Video className="h-4 w-4" />
                </Button>
              )}



              {/* Complete Session Button - always visible for active sessions */}
              {(session.status === 'accepted' || session.status === 'in_progress') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCompleteSession}
                  className="hover:bg-muted"
                  title="Complete and end session"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Complete Session
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Session Info */}
        <div className="text-center">
          <div className="inline-block bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground">
            Session started on {formatDate(session.created_at)}
          </div>
        </div>

        {/* Initial Message */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={session.student?.avatar_url || undefined}
                alt={session.student?.full_name || 'Student'}
              />
              <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                {getInitials(session.student?.full_name || 'Student')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-foreground">{session.student?.full_name}</span>
                <span className="text-xs text-muted-foreground">requested help with</span>
              </div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">{session.topic}</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">{session.message}</p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        {messages.map((message) => (
          <div
            key={message.id}
            className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === currentUser.id}
              currentUser={currentUser}
            />
          </div>

        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {session.status !== 'completed' && (
        <Card className="rounded-none border-x-0 border-b-0">
          <CardContent className="pt-4">
            {error && (
              <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isLoading || !newMessage.trim()}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
          </CardContent>
        </Card>
      )}

      {session.status === 'completed' && (
        <Card className="rounded-none border-x-0 border-b-0">
          <CardContent className="pt-4">
            <div className="text-center text-gray-600">
              <p className="text-sm">This session has been completed.</p>
              {isStudent && (
                <Link href={`/feedback/${session.id}`}>
                  <Button variant="outline" size="sm" className="mt-2">
                    Leave Feedback
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}