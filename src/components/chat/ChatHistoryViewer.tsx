'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  ArrowLeft, 
  Search, 
  Download, 
  Calendar, 
  Clock, 
  User,
  MessageCircle,
  FileText,
  Video
} from 'lucide-react'
import MessageBubble from './MessageBubble'

interface ChatHistoryViewerProps {
  session: any
  currentUserId: string
  onBack: () => void
}

export default function ChatHistoryViewer({ session, currentUserId, onBack }: ChatHistoryViewerProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const isStudent = session.student_id === currentUserId
  const otherUser = isStudent ? session.mentor : session.student

  const filteredMessages = useMemo(() => {
    if (!searchQuery) return session.messages

    const query = searchQuery.toLowerCase()
    return session.messages.filter((message: any) => 
      message.content?.toLowerCase().includes(query) ||
      message.sender?.full_name?.toLowerCase().includes(query)
    )
  }, [session.messages, searchQuery])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calculateSessionDuration = () => {
    if (!session.completed_at) return 'Unknown'
    
    const startTime = new Date(session.created_at)
    const endTime = new Date(session.completed_at)
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationMinutes = Math.floor(durationMs / (1000 * 60))
    const durationHours = Math.floor(durationMinutes / 60)
    const remainingMinutes = durationMinutes % 60

    if (durationHours > 0) {
      return `${durationHours}h ${remainingMinutes}m`
    } else {
      return `${durationMinutes}m`
    }
  }

  const getSessionStats = () => {
    const messageCount = session.messages.length
    const fileCount = session.messages.filter((msg: any) => msg.message_type === 'file').length
    const hasVideoCall = session.messages.some((msg: any) => 
      msg.message_type === 'system' && msg.metadata?.type === 'video_call'
    )
    
    return { messageCount, fileCount, hasVideoCall }
  }

  const exportChat = () => {
    const chatData = {
      session: {
        id: session.id,
        topic: session.topic,
        created_at: session.created_at,
        completed_at: session.completed_at,
        duration: calculateSessionDuration(),
        participants: {
          student: session.student,
          mentor: session.mentor
        }
      },
      messages: session.messages.map((msg: any) => ({
        id: msg.id,
        sender: msg.sender?.full_name || 'Unknown',
        content: msg.content,
        type: msg.message_type,
        timestamp: msg.created_at,
        file_url: msg.file_url
      }))
    }

    const dataStr = JSON.stringify(chatData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `chat-history-${session.topic.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${session.id.slice(0, 8)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const stats = getSessionStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="hover:bg-muted">
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <Avatar className="h-12 w-12">
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
                  {session.topic}
                </CardTitle>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {isStudent ? 'Mentor: ' : 'Student: '}{otherUser?.full_name}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(session.completed_at || session.created_at)}
                  </span>
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {calculateSessionDuration()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {isStudent ? 'Student' : 'Mentor'}
              </Badge>
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Completed
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Session Stats */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="font-medium">{stats.messageCount}</span> messages
              </span>
            </div>
            {stats.fileCount > 0 && (
              <div className="flex items-center justify-center space-x-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">{stats.fileCount}</span> files
                </span>
              </div>
            )}
            {stats.hasVideoCall && (
              <div className="flex items-center justify-center space-x-2">
                <Video className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Video call</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search and Export */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button variant="outline" onClick={exportChat}>
          <Download className="h-4 w-4 mr-2" />
          Export Chat
        </Button>
      </div>

      {/* Messages */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchQuery ? 'No matching messages' : 'No messages found'}
                </h3>
                <p className="text-muted-foreground text-center">
                  {searchQuery 
                    ? 'Try adjusting your search terms'
                    : 'This session has no messages'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4 p-6">
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

                {/* Messages */}
                {filteredMessages.map((message: any) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.sender_id === currentUserId}
                    currentUser={{ id: currentUserId } as any}
                  />
                ))}

                {searchQuery && filteredMessages.length < session.messages.length && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {filteredMessages.length} of {session.messages.length} messages
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}