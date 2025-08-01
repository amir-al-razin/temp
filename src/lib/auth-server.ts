import { createClient } from './supabase/server'
import { getUserProfile, type Profile } from './auth'

// Server-side auth functions
export async function getServerUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) return null
  return user
}

// Check if user is admin (proper implementation)
export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('admins')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (error) {
    // Fallback to email-based check for initial setup
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()
    
    return profile?.email?.includes('admin') || false
  }
  
  return data?.role === 'admin' || data?.role === 'super_admin'
}

// Server-side profile functions
export async function getServerUserProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return null
  return data
}