import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'
import { getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import MentorApplicationForm from '@/components/mentors/MentorApplicationForm'

export default async function MentorApplicationPage() {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/auth')
  }

  const profile = await getUserProfile(user.id)
  
  if (!profile?.full_name) {
    redirect('/profile?message=Please complete your profile before applying to be a mentor')
  }

  // Check if user already has a mentor application
  const supabase = await createClient()
  const { data: existingApplication } = await supabase
    .from('mentors')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Become a Mentor</h1>
            <p className="mt-2 text-muted-foreground">
              Share your knowledge and help fellow students succeed in their academic journey
            </p>
          </div>
          
          <MentorApplicationForm 
            user={user} 
            profile={profile} 
            existingApplication={existingApplication}
          />
        </div>
      </div>
    </AppLayout>
  )
}