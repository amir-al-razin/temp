import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import ChatInterface from '@/components/chat/ChatInterface'

interface PageProps {
  params: {
    sessionId: string
  }
}

export default async function ChatPage({ params }: PageProps) {
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

  // Check if user is participant in this session
  if (session.student_id !== user.id && session.mentor_id !== user.id) {
    redirect('/sessions?error=unauthorized')
  }

  // Check if session is in a state that allows chatting
  if (!['accepted', 'scheduled', 'in_progress', 'completed'].includes(session.status)) {
    redirect('/sessions?error=session-not-active')
  }

  // Get existing messages
  const { data: messages } = await supabase
    .from('messages')
    .select(`
      *,
      sender:sender_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('session_id', params.sessionId)
    .order('created_at', { ascending: true })

  return (
    <div className="h-screen bg-gray-50">
      <ChatInterface 
        session={session}
        currentUser={user}
        initialMessages={messages || []}
      />
    </div>
  )
}