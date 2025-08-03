// Core types for the Eagles Mentorship Platform

export interface User {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
  }
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

export interface Mentor {
  id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  expertise_tags: string[]
  achievements: string
  role_title: string
  availability_status: 'available' | 'busy' | 'offline'
  approved_at: string | null
  created_at: string
  updated_at: string
  profiles: Profile
}

export interface Session {
  id: string
  student_id: string
  mentor_id: string
  status: 'requested' | 'accepted' | 'scheduled' | 'in_progress' | 'completed'
  topic: string
  message: string
  preferred_format: 'chat' | 'video'
  duration: number
  scheduled_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  student?: Profile
  mentor?: Profile
}

export interface Message {
  id: string
  session_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'image' | 'file' | 'system'
  file_url: string | null
  file_name: string | null
  file_size: number | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  sender?: Profile
  sending?: boolean
}

export interface Notification {
  id: string
  user_id: string
  type: 'session_request' | 'session_accepted' | 'session_declined' | 'message_received' | 'session_completed' | 'mentor_approved' | 'system_announcement' | 'reminder'
  title: string
  message: string
  data: Record<string, unknown>
  read_at: string | null
  expires_at: string | null
  priority: number
  created_at: string
}

export interface Feedback {
  id: string
  session_id: string
  student_id: string
  mentor_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface Admin {
  id: string
  user_id: string
  role: 'admin' | 'super_admin'
  permissions: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ApiError {
  message: string
  code?: string
  details?: Record<string, unknown>
  statusCode?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  hasMore: boolean
  nextPage?: number
}

// Form types
export interface SessionRequestForm {
  topic: string
  message: string
  preferred_format: 'chat' | 'video'
  duration: string
}

export interface MentorApplicationForm {
  role_title: string
  expertise_tags: string[]
  achievements: string
  bio: string
}

export interface ProfileUpdateForm {
  full_name: string
  department: string
  year: number
  bio: string
}

// Component prop types
export interface SessionActionsProps {
  session: Session
  currentUserId: string
  isStudent: boolean
}

export interface ChatInterfaceProps {
  session: Session
  currentUser: User
  initialMessages: Message[]
}

export interface MentorGridProps {
  mentors: Mentor[]
  availableExpertise: string[]
  availableDepartments: string[]
}

export interface ApplicationQueueProps {
  applications: Mentor[]
}

// AI Mentor Search types
export interface SearchPlatform {
  id: string
  name: string
  description: string
  icon: string
}

export interface ExternalProfile {
  name: string | null
  title: string | null
  link: string
  snippet: string | null
  image: string | null
  platform: string
  relevance_score?: number
}

export interface SearchResults {
  internal: Mentor[]
  external: ExternalProfile[]
  query: string
  searchTime: number
}

export interface SearchState {
  query: string
  isSearching: boolean
  platforms: string[]
  results: SearchResults | null
  error: string | null
  resumeUrl: string | null
  step: 'input' | 'platform_selection' | 'searching' | 'results'
}

export interface AISearchResponse {
  success: boolean
  step?: string
  resumeUrl?: string
  platforms?: SearchPlatform[]
  data?: SearchResults
  stats?: {
    internal_count: number
    external_count: number
    total_count: number
  }
  error?: string
}

// AI Search types
export interface SearchPlatform {
  id: string
  name: string
  description: string
  icon: string
}

export interface SearchResult {
  id: string
  name: string
  title: string
  platform: string
  profileUrl: string
  imageUrl?: string
  description: string
  relevanceScore: number
  expertise: string[]
  location?: string
  company?: string
  university?: string
}

export interface AISearchResponse {
  success: boolean
  step: 'platform_selection' | 'search' | 'results'
  data?: SearchResult[]
  resumeUrl?: string
  error?: string
}

export interface SearchState {
  query: string
  isSearching: boolean
  platforms: string[]
  results: SearchResult[] | null
  error: string | null
  resumeUrl: string | null
  step: 'input' | 'platform_selection' | 'searching' | 'results'
}

// Utility types
export type SessionStatus = Session['status']
export type MessageType = Message['message_type']
export type NotificationType = Notification['type']
export type MentorStatus = Mentor['status']
export type AvailabilityStatus = Mentor['availability_status']