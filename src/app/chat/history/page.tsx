import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import ChatHistoryList from '@/components/chat/ChatHistoryList'

export default async function ChatHistoryPage() {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/auth')
  }

  const supabase = await createClient()

  // Get all completed sessions with messages for the current user
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      *,
      student:student_id (
        id,
        full_name,
        avatar_url,
        department,
        year
      ),
      mentor:mentor_id (
        id,
        full_name,
        avatar_url,
        department,
        year
      ),
      messages (
        id,
        content,
        message_type,
        file_url,
        metadata,
        created_at,
        sender:sender_id (
          id,
          full_name,
          avatar_url
        )
      )
    `)
    .or(`student_id.eq.${user.id},mentor_id.eq.${user.id}`)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  if (error) {
    console.error('Error fetching chat history:', error)
  }

  // Filter sessions that have messages and sort messages by date
  const sessionsWithMessages = sessions?.filter(session => 
    session.messages && session.messages.length > 0
  ).map(session => ({
    ...session,
    messages: session.messages.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  })) || []

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Chat History</h1>
            <p className="mt-2 text-muted-foreground">
              View and search your past mentorship conversations
            </p>
          </div>
          
          <ChatHistoryList sessions={sessionsWithMessages} currentUserId={user.id} />
        </div>
      </div>
    </AppLayout>
  )
}