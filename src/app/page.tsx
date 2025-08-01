import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'

export default async function Home() {
  const user = await getServerUser()

  // Redirect authenticated users to dashboard
  if (user) {
    redirect('/dashboard')
  }

  // Redirect unauthenticated users to auth page
  redirect('/auth')
}
