import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'
import { getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MessageCircle, User, Users } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import SessionActions from '@/components/sessions/SessionActions'
import Link from 'next/link'

export default async function SessionsPage() {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/auth')
  }

  const profile = await getUserProfile(user.id)
  const supabase = await createClient()

  // Get sessions where user is either student or mentor
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      *,
      student:student_id (
        id,
        full_name,
        department,
        year,
        avatar_url
      ),
      mentor:mentor_id (
        id,
        full_name,
        department,
        year,
        avatar_url
      )
    `)
    .or(`student_id.eq.${user.id},mentor_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching sessions:', error)
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
      case 'requested':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'accepted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'scheduled':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'in_progress':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'requested':
        return 'Requested'
      case 'accepted':
        return 'Accepted'
      case 'scheduled':
        return 'Scheduled'
      case 'in_progress':
        return 'In Progress'
      case 'completed':
        return 'Completed'
      default:
        return status
    }
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

  if (!sessions || sessions.length === 0) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">My Sessions</h1>
              <p className="mt-2 text-muted-foreground">
                Manage your mentorship sessions
              </p>
            </div>

            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Sessions Yet</h3>
                <p className="text-muted-foreground text-center mb-6">
                  You haven't requested or received any mentorship sessions yet.
                </p>
                <Link href="/mentors/explore">
                  <Button>Find a Mentor</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">My Sessions</h1>
            <p className="mt-2 text-muted-foreground">
              Manage your mentorship sessions
            </p>
          </div>

          <div className="space-y-6">
            {sessions.map((session) => {
              const isStudent = session.student_id === user.id
              const otherUser = isStudent ? session.mentor : session.student
              const role = isStudent ? 'Student' : 'Mentor'

              return (
                <Card key={session.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage 
                            src={otherUser?.avatar_url || undefined} 
                            alt={otherUser?.full_name || 'User'} 
                          />
                          <AvatarFallback>
                            {getInitials(otherUser?.full_name || 'User')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">
                            {session.topic}
                          </CardTitle>
                          <CardDescription className="flex items-center space-x-4 mt-1">
                            <span className="flex items-center">
                              <User className="h-4 w-4 mr-1" />
                              {isStudent ? 'Mentor: ' : 'Student: '}{otherUser?.full_name}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDate(session.created_at)}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {session.duration} min
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {role}
                        </Badge>
                        <Badge 
                          className={`text-xs ${getStatusColor(session.status)}`}
                          variant="secondary"
                        >
                          {getStatusText(session.status)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Message */}
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Message</p>
                      <p className="text-sm text-muted-foreground">{session.message}</p>
                    </div>

                    {/* Format */}
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Format: {session.preferred_format === 'chat' ? 'Text Chat' : 'Video Call'}
                      </span>
                    </div>

                    {/* Actions */}
                    <SessionActions 
                      session={session}
                      currentUserId={user.id}
                      isStudent={isStudent}
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <Card>
              <CardContent className="flex items-center justify-between py-6">
                <div>
                  <h3 className="text-lg font-medium text-foreground">Need more help?</h3>
                  <p className="text-sm text-muted-foreground">Find additional mentors to guide you</p>
                </div>
                <Link href="/mentors/explore">
                  <Button>
                    <Users className="h-4 w-4 mr-2" />
                    Explore Mentors
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between py-6">
                <div>
                  <h3 className="text-lg font-medium text-foreground">View Past Conversations</h3>
                  <p className="text-sm text-muted-foreground">Access your completed session chats</p>
                </div>
                <Link href="/chat/history">
                  <Button variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat History
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}