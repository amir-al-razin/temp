import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'
import AppLayout from '@/components/layout/AppLayout'
import NotificationCenter from '@/components/notifications/NotificationCenter'

export default async function NotificationsPage() {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/auth')
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
            <p className="mt-2 text-muted-foreground">
              Stay updated with your mentorship activities
            </p>
          </div>
          
          <NotificationCenter userId={user.id} />
        </div>
      </div>
    </AppLayout>
  )
}