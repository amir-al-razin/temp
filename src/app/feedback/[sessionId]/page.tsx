import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import FeedbackForm from '@/components/feedback/FeedbackForm'

interface PageProps {
  params: {
    sessionId: string
  }
}

export default async function FeedbackPage({ params }: PageProps) {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/auth')
  }

  const supabase = await createClient()

  // Get session information and verify user access
  const { data: session, error } = await supabase
    .from('sessions')
    .select(`
      *,
      student:student_id (
        id,
        full_name,
        avatar_url
      ),
      mentor:mentor_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('id', params.sessionId)
    .single()

  if (error || !session) {
    redirect('/sessions?error=session-not-found')
  }

  // Only students can leave feedback
  if (session.student_id !== user.id) {
    redirect('/sessions?error=unauthorized')
  }

  // Session must be completed to leave feedback
  if (session.status !== 'completed') {
    redirect('/sessions?error=session-not-completed')
  }

  // Check if feedback already exists
  const { data: existingFeedback } = await supabase
    .from('feedback')
    .select('*')
    .eq('session_id', params.sessionId)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <FeedbackForm 
            session={session}
            currentUser={user}
            existingFeedback={existingFeedback}
          />
        </div>
      </div>
    </div>
  )
}