import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'
import { getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import MentorAvailability from '@/components/calendar/MentorAvailability'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Users, CheckCircle } from 'lucide-react'

export default async function CalendarPage() {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/auth')
  }

  const profile = await getUserProfile(user.id)
  const supabase = await createClient()

  // Check if user is a mentor
  const { data: mentorData } = await supabase
    .from('mentors')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .single()

  if (!mentorData) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Calendar Access Restricted</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Calendar management is only available for approved mentors.
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  If you're a mentor, please ensure your application has been approved.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Get calendar statistics
  const { data: upcomingSessions } = await supabase
    .from('session_schedules')
    .select(`
      *,
      session:sessions (
        id,
        topic,
        student:student_id (
          full_name,
          avatar_url
        )
      )
    `)
    .eq('sessions.mentor_id', user.id)
    .gte('scheduled_start', new Date().toISOString())
    .order('scheduled_start')
    .limit(5)

  const { data: availabilityStats } = await supabase
    .from('mentor_availability')
    .select('id, is_available')
    .eq('mentor_id', user.id)
    .gte('start_time', new Date().toISOString())

  const totalSlots = availabilityStats?.length || 0
  const availableSlots = availabilityStats?.filter(slot => slot.is_available).length || 0
  const bookedSlots = totalSlots - availableSlots

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Calendar Management</h1>
            <p className="mt-2 text-muted-foreground">
              Manage your availability and scheduled mentorship sessions
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingSessions?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Next 7 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Slots</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{availableSlots}</div>
                <p className="text-xs text-muted-foreground">
                  Ready for booking
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Booked Slots</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{bookedSlots}</div>
                <p className="text-xs text-muted-foreground">
                  Sessions scheduled
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Booking Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Slots booked
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Sessions */}
          {upcomingSessions && upcomingSessions.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Upcoming Sessions</CardTitle>
                <CardDescription>Your scheduled mentorship sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingSessions.map((schedule: any) => (
                    <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{schedule.session?.topic}</span>
                          <span className="text-sm text-muted-foreground">
                            with {schedule.session?.student?.full_name}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {new Date(schedule.scheduled_start).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(schedule.scheduled_start).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Availability Management */}
          <MentorAvailability mentorId={user.id} />
        </div>
      </div>
    </AppLayout>
  )
}