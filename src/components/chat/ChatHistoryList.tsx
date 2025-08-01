'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  MessageCircle, 
  Calendar, 
  Clock, 
  Download, 
  Eye,
  Filter,
  User,
  FileText,
  Video
} from 'lucide-react'
import Link from 'next/link'
import ChatHistoryViewer from './ChatHistoryViewer'

interface ChatHistoryListProps {
  sessions: any[]
  currentUserId: string
}

export default function ChatHistoryList({ sessions, currentUserId }: ChatHistoryListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [filterType, setFilterType] = useState('all')

  const filteredSessions = useMemo(() => {
    let filtered = sessions

    // Filter by type
    if (filterType === 'with-messages') {
      filtered = filtered.filter(session => session.messages.length > 0)
    } else if (filterType === 'with-files') {
      filtered = filtered.filter(session => 
        session.messages.some((msg: any) => msg.message_type === 'file')
      )
    } else if (filterType === 'with-video') {
      filtered = filtered.filter(session => 
        session.messages.some((msg: any) => 
          msg.message_type === 'system' && msg.metadata?.type === 'video_call'
        )
      )
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(session => {
        // Search in session topic
        if (session.topic.toLowerCase().includes(query)) return true
        
        // Search in participant names
        const otherUser = session.student_id === currentUserId ? session.mentor : session.student
        if (otherUser?.full_name?.toLowerCase().includes(query)) return true
        
        // Search in message content
        return session.messages.some((message: any) => 
          message.content?.toLowerCase().includes(query)
        )
      })
    }

    return filtered
  }, [sessions, searchQuery, filterType, currentUserId])

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

  const getSessionStats = (session: any) => {
    const messageCount = session.messages.length
    const fileCount = session.messages.filter((msg: any) => msg.message_type === 'file').length
    const hasVideoCall = session.messages.some((msg: any) => 
      msg.message_type === 'system' && msg.metadata?.type === 'video_call'
    )
    
    return { messageCount, fileCount, hasVideoCall }
  }

  const calculateSessionDuration = (session: any) => {
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

  if (selectedSession) {
    return (
      <ChatHistoryViewer 
        session={selectedSession}
        currentUserId={currentUserId}
        onBack={() => setSelectedSession(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations, participants, or messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Tabs value={filterType} onValueChange={setFilterType} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="with-messages">Messages</TabsTrigger>
            <TabsTrigger value="with-files">Files</TabsTrigger>
            <TabsTrigger value="with-video">Video</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchQuery ? 'No matching conversations' : 'No chat history yet'}
            </h3>
            <p className="text-muted-foreground text-center">
              {searchQuery 
                ? 'Try adjusting your search terms or filters'
                : 'Complete some mentorship sessions to see your chat history here'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const isStudent = session.student_id === currentUserId
            const otherUser = isStudent ? session.mentor : session.student
            const stats = getSessionStats(session)
            const duration = calculateSessionDuration(session)

            return (
              <Card key={session.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage 
                          src={otherUser?.avatar_url || undefined} 
                          alt={otherUser?.full_name || 'User'} 
                        />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {getInitials(otherUser?.full_name || 'User')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg text-foreground">
                          {session.topic}
                        </CardTitle>
                        <CardDescription className="flex items-center space-x-4 mt-1">
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
                            {duration}
                          </span>
                        </CardDescription>
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
                
                <CardContent className="space-y-4">
                  {/* Session Stats */}
                  <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      {stats.messageCount} messages
                    </span>
                    {stats.fileCount > 0 && (
                      <span className="flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        {stats.fileCount} files
                      </span>
                    )}
                    {stats.hasVideoCall && (
                      <span className="flex items-center">
                        <Video className="h-4 w-4 mr-1" />
                        Video call
                      </span>
                    )}
                  </div>

                  {/* Last Message Preview */}
                  {session.messages.length > 0 && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground mb-1">Last message:</p>
                      <p className="text-sm text-foreground line-clamp-2">
                        {session.messages[session.messages.length - 1].content || 
                         (session.messages[session.messages.length - 1].message_type === 'file' ? 
                          `📎 ${session.messages[session.messages.length - 1].content}` : 
                          'System message')}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSession(session)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Chat
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: Implement export functionality
                        console.log('Export chat:', session.id)
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Quick Stats */}
      {sessions.length > 0 && (
        <Card>
          <CardContent className="py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-foreground">{sessions.length}</div>
                <div className="text-sm text-muted-foreground">Total Sessions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {sessions.reduce((acc, session) => acc + session.messages.length, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Messages</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {sessions.reduce((acc, session) => 
                    acc + session.messages.filter((msg: any) => msg.message_type === 'file').length, 0
                  )}
                </div>
                <div className="text-sm text-muted-foreground">Files Shared</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {sessions.filter(session => 
                    session.messages.some((msg: any) => 
                      msg.message_type === 'system' && msg.metadata?.type === 'video_call'
                    )
                  ).length}
                </div>
                <div className="text-sm text-muted-foreground">Video Calls</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}