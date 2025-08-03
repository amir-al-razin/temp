import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'
import { getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import SessionRequestForm from '@/components/sessions/SessionRequestForm'

interface PageProps {
  params: Promise<{
    mentorId: string
  }>
}

export default async function SessionRequestPage({ params }: PageProps) {
  const { mentorId } = await params
  const user = await getServerUser()
  
  if (!user) {
    redirect('/auth')
  }

  const profile = await getUserProfile(user.id)
  
  if (!profile?.full_name) {
    redirect('/profile?message=Please complete your profile before requesting sessions')
  }

  const supabase = await createClient()

  // Get mentor information
  const { data: mentor, error } = await supabase
    .from('mentors')
    .select(`
      *,
      profiles:user_id (
        id,
        email,
        full_name,
        department,
        year,
        avatar_url,
        bio
      )
    `)
    .eq('user_id', mentorId)
    .eq('status', 'approved')
    .single()

  if (error || !mentor) {
    redirect('/mentors/explore?error=mentor-not-found')
  }

  // Check if user is trying to request session with themselves
  if (mentor.user_id === user.id) {
    redirect('/mentors/explore?error=cannot-request-self')
  }

  // Check for existing pending/active sessions
  const { data: existingSessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('student_id', user.id)
    .eq('mentor_id', mentor.user_id)
    .in('status', ['requested', 'accepted', 'scheduled', 'in_progress'])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <SessionRequestForm 
            user={user}
            profile={profile}
            mentor={mentor}
            existingSessions={existingSessions || []}
          />
        </div>
      </div>
    </div>
  )
}