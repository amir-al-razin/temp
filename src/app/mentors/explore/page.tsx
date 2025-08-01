import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import MentorGrid from '@/components/mentors/MentorGrid'

export default async function ExploreMentorsPage() {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/auth')
  }

  const supabase = await createClient()

  // Get approved mentors with their profiles
  const { data: mentors, error } = await supabase
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
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })

  if (error) {
    console.error('Error fetching mentors:', error)
  }

  // Get all unique expertise tags and departments for filtering
  const expertiseTags = new Set<string>()
  const departments = new Set<string>()

  mentors?.forEach(mentor => {
    mentor.expertise_tags?.forEach((tag: string) => expertiseTags.add(tag))
    if (mentor.profiles?.department) {
      departments.add(mentor.profiles.department)
    }
  })

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Explore Mentors</h1>
            <p className="mt-2 text-muted-foreground">
              Find experienced mentors who can guide you in your academic and career journey
            </p>
          </div>
          
          <MentorGrid 
            mentors={mentors || []}
            availableExpertise={Array.from(expertiseTags).sort()}
            availableDepartments={Array.from(departments).sort()}
          />
        </div>
      </div>
    </AppLayout>
  )
}