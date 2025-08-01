import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'
import { getUserProfile } from '@/lib/auth'
import AppLayout from '@/components/layout/AppLayout'
import ProfileForm from '@/components/profile/ProfileForm'

export default async function ProfilePage() {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/auth')
  }

  const profile = await getUserProfile(user.id)

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
            <p className="mt-2 text-muted-foreground">
              Manage your personal information and preferences
            </p>
          </div>
          
          <ProfileForm user={user} profile={profile} />
        </div>
      </div>
    </AppLayout>
  )
}