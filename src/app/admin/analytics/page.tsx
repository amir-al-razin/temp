import { redirect } from 'next/navigation'
import { getServerUser, isAdmin } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  GraduationCap, 
  MessageCircle, 
  Star, 
  TrendingUp, 
  Calendar,
  Clock,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'

export default async function AdminAnalyticsPage() {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/auth')
  }

  const userIsAdmin = await isAdmin(user.id)
  
  if (!userIsAdmin) {
    redirect('/dashboard?error=unauthorized')
  }

  const supabase = await createClient()

  // Get comprehensive analytics data
  const [
    { count: totalUsers },
    { count: totalMentors },
    { count: activeMentors },
    { count: pendingApplications },
    { count: totalSessions },
    { count: completedSessions },
    { count: activeSessions },
    { data: recentSessions },
    { data: feedbackData },
    { data: topMentors }
  ] = await Promise.all([
    // User statistics
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('mentors').select('*', { count: 'exact', head: true }),
    supabase.from('mentors').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('mentors').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    
    // Session statistics
    supabase.from('sessions').select('*', { count: 'exact', head: true }),
    supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('sessions').select('*', { count: 'exact', head: true }).in('status', ['accepted', 'scheduled', 'in_progress']),
    
    // Recent sessions
    supabase
      .from('sessions')
      .select(`
        *,
        student:student_id (full_name),
        mentor:mentor_id (full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(10),
    
    // Feedback data
    supabase
      .from('feedback')
      .select('rating, comment, created_at'),
    
    // Top mentors by session count
    supabase
      .from('sessions')
      .select(`
        mentor_id,
        mentor:mentor_id (
          profiles:user_id (full_name)
        )
      `)
      .eq('status', 'completed')
  ])

  // Calculate metrics
  const sessionCompletionRate = (totalSessions && totalSessions > 0 && completedSessions) ? Math.round((completedSessions / totalSessions) * 100) : 0
  const mentorApprovalRate = (totalMentors && totalMentors > 0 && activeMentors) ? Math.round((activeMentors / totalMentors) * 100) : 0
  const averageRating = (feedbackData && feedbackData.length > 0)
    ? (feedbackData.reduce((sum: number, f: any) => sum + f.rating, 0) / feedbackData.length).toFixed(1)
    : 'N/A'

  // Process top mentors
  const mentorSessionCounts = topMentors?.reduce((acc: any, session: any) => {
    const mentorId = session.mentor_id
    const mentorName = session.mentor?.profiles?.full_name || 'Unknown'
    acc[mentorId] = {
      name: mentorName,
      count: (acc[mentorId]?.count || 0) + 1
    }
    return acc
  }, {})

  const topMentorsList = Object.entries(mentorSessionCounts || {})
    .sort(([,a]: any, [,b]: any) => b.count - a.count)
    .slice(0, 5)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>
            <p className="mt-2 text-gray-600">
              Comprehensive insights into the Eagles mentorship platform
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Registered students
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Mentors</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeMentors || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {mentorApprovalRate}% approval rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSessions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {sessionCompletionRate}% completion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageRating}</div>
                <p className="text-xs text-muted-foreground">
                  From {feedbackData?.length || 0} reviews
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Session Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Session Status Overview</CardTitle>
                <CardDescription>Current state of all sessions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Completed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{completedSessions || 0}</span>
                    <Badge variant="secondary">{sessionCompletionRate}%</Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Active</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{activeSessions || 0}</span>
                    <Badge variant="outline">
                      {(totalSessions && totalSessions > 0 && activeSessions) ? Math.round((activeSessions / totalSessions) * 100) : 0}%
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">Pending Applications</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{pendingApplications || 0}</span>
                    {(pendingApplications && pendingApplications > 0) && (
                      <Link href="/admin/applications">
                        <Button size="sm" variant="outline">Review</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Mentors */}
            <Card>
              <CardHeader>
                <CardTitle>Top Mentors</CardTitle>
                <CardDescription>Most active mentors by completed sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {topMentorsList.length > 0 ? (
                  <div className="space-y-3">
                    {topMentorsList.map(([mentorId, data]: any, index) => (
                      <div key={mentorId} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium">{data.name}</span>
                        </div>
                        <Badge variant="secondary">
                          {data.count} session{data.count !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No completed sessions yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Latest mentorship session activity</CardDescription>
            </CardHeader>
            <CardContent>
              {recentSessions && recentSessions.length > 0 ? (
                <div className="space-y-4">
                  {recentSessions.slice(0, 8).map((session: any) => (
                    <div key={session.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{session.topic}</h4>
                        <p className="text-xs text-gray-500">
                          {session.student?.full_name} → {session.mentor?.full_name}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant={session.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {session.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDate(session.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No sessions yet</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Link href="/admin/applications">
                  <Button variant="outline">
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Review Applications
                  </Button>
                </Link>
                <Link href="/admin/dashboard">
                  <Button variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Admin Dashboard
                  </Button>
                </Link>
                <Link href="/mentors/explore">
                  <Button variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    View Mentors
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}