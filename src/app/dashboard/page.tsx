import { redirect } from 'next/navigation'
import { getServerUser, getServerUserProfile } from '@/lib/auth-server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'

export default async function DashboardPage() {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/auth')
  }

  const profile = await getServerUserProfile(user.id)

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {profile?.full_name || 'Student'}!
            </h1>
            <p className="mt-2 text-muted-foreground">
              Ready to continue your mentorship journey?
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Find Mentors</CardTitle>
                <CardDescription>
                  Browse available mentors in your field
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/mentors/explore">
                  <Button className="w-full">Explore Mentors</Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>My Sessions</CardTitle>
                <CardDescription>
                  View and manage your mentorship sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/sessions">
                  <Button className="w-full" variant="outline">View Sessions</Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Become a Mentor</CardTitle>
                <CardDescription>
                  Share your knowledge with other students
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/mentors/apply">
                  <Button className="w-full" variant="secondary">Apply Now</Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {!profile?.full_name && (
            <Card className="mt-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
              <CardHeader>
                <CardTitle className="text-yellow-800 dark:text-yellow-200">Complete Your Profile</CardTitle>
                <CardDescription className="text-yellow-700 dark:text-yellow-300">
                  Add your information to get the most out of the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/profile">
                  <Button variant="outline" className="border-yellow-300 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-200 dark:hover:bg-yellow-900">
                    Complete Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}