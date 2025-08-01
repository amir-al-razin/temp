import { createClient } from './supabase/client'

export interface AuthUser {
  id: string
  email: string
  full_name?: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  department: string | null
  year: number | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

// University email validation
export function validateUniversityEmail(email: string): boolean {
  const universityDomain = process.env.NEXT_PUBLIC_UNIVERSITY_DOMAIN || 'university.edu'
  return email.endsWith(`@${universityDomain}`)
}

// Client-side auth functions
export async function signUp(email: string, password: string, fullName: string) {
  if (!validateUniversityEmail(email)) {
    throw new Error('Please use your university email address')
  }

  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    // If profile doesn't exist, try to create it
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.id === userId) {
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || null
        }])
        .select()
        .single()
      
      if (!createError) return newProfile
    }
    return null
  }
  return data
}

export async function updateUserProfile(userId: string, updates: Partial<Profile>) {
  const supabase = createClient()
  
  // Get current user to ensure we have the email
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Use upsert to either insert or update the profile
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: user.email || '',
      ...updates,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error
  return data
}