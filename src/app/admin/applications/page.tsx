import { redirect } from 'next/navigation'
import { getServerUser, isAdmin } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import ApplicationQueue from '@/components/admin/ApplicationQueue'

export default async function AdminApplicationsPage() {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/auth')
  }

  const userIsAdmin = await isAdmin(user.id)
  
  if (!userIsAdmin) {
    redirect('/dashboard?error=unauthorized')
  }

  const supabase = await createClient()

  // Get pending applications with user profiles
  const { data: applications, error } = await supabase
    .from('mentors')
    .select(`
      *,
      profiles:user_id (
        id,
        email,
        full_name,
        department,
        year,
        avatar_url
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching applications:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Mentor Applications</h1>
            <p className="mt-2 text-gray-600">
              Review and approve mentor applications from students
            </p>
          </div>
          
          <ApplicationQueue applications={applications || []} />
        </div>
      </div>
    </div>
  )
}