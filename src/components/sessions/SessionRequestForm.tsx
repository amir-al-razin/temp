'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/auth'
import { ArrowLeft, Clock, MessageCircle, Video, Calendar } from 'lucide-react'
import SessionScheduler from '@/components/calendar/SessionScheduler'
import Link from 'next/link'

import type { User, Profile, Mentor, Session } from '@/types'

interface SessionRequestFormProps {
  user: User
  profile: Profile
  mentor: Mentor
  existingSessions: Session[]
}

const sessionDurations = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' }
]

export default function SessionRequestForm({ 
  user, 
  profile, 
  mentor, 
  existingSessions 
}: SessionRequestFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    topic: '',
    message: '',
    preferred_format: 'chat',
    duration: '60'
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
    setSuccess(null)
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
    setSuccess(null)
  }

  const validateForm = () => {
    if (!formData.topic.trim()) {
      setError('Please enter a topic for your session')
      return false
    }
    
    if (!formData.message.trim()) {
      setError('Please provide a message explaining what you need help with')
      return false
    }

    if (formData.message.trim().length < 20) {
      setError('Please provide a more detailed message (at least 20 characters)')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const sessionData = {
        student_id: user.id,
        mentor_id: mentor.user_id,
        topic: formData.topic.trim(),
        message: formData.message.trim(),
        preferred_format: formData.preferred_format,
        duration: parseInt(formData.duration),
        status: 'requested'
      }

      const { error } = await supabase
        .from('sessions')
        .insert([sessionData])

      if (error) throw error

      setSuccess('Your session request has been sent successfully!')
      
      // Redirect to sessions page after a delay
      setTimeout(() => {
        router.push('/sessions')
      }, 2000)

    } catch (err) {
      const error = err as Error
      setError(error.message || 'Failed to send session request. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Show existing sessions warning
  if (existingSessions.length > 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/mentors/explore">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Mentors
            </Button>
          </Link>
        </div>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Existing Session Found</CardTitle>
            <CardDescription className="text-yellow-700">
              You already have an active session with this mentor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-800 mb-4">
              You can only have one active session with each mentor at a time. 
              Please wait for your current session to be completed before requesting a new one.
            </p>
            <div className="flex space-x-3">
              <Link href="/sessions">
                <Button variant="outline" className="border-yellow-300 text-yellow-800 hover:bg-yellow-100">
                  View My Sessions
                </Button>
              </Link>
              <Link href="/mentors/explore">
                <Button variant="outline" className="border-yellow-300 text-yellow-800 hover:bg-yellow-100">
                  Find Other Mentors
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center space-x-4">
        <Link href="/mentors/explore">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Mentors
          </Button>
        </Link>
      </div>

      {/* Mentor Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage 
                src={mentor.profiles.avatar_url || undefined} 
                alt={mentor.profiles.full_name} 
              />
              <AvatarFallback className="text-lg">
                {getInitials(mentor.profiles.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{mentor.profiles.full_name}</CardTitle>
              <CardDescription className="text-base">
                {mentor.profiles.department} • Year {mentor.profiles.year}
              </CardDescription>
              <p className="text-sm text-gray-600 mt-1">{mentor.role_title}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Areas of Expertise</h4>
              <div className="flex flex-wrap gap-2">
                {mentor.expertise_tags.map((tag: string) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
            {mentor.profiles.bio && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">About</h4>
                <p className="text-gray-700">{mentor.profiles.bio}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Request Options */}
      <Card>
        <CardHeader>
          <CardTitle>Request a Mentorship Session</CardTitle>
          <CardDescription>
            Choose how you'd like to schedule your session with {mentor.profiles.full_name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="request" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="request" className="flex items-center space-x-2">
                <MessageCircle className="h-4 w-4" />
                <span>Send Request</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Schedule Now</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="request">
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Traditional Request</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Send a request to the mentor and wait for them to accept. You'll be able to chat once they approve your request.
                  </p>
                </div>
                
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Topic */}
                    <div className="space-y-2">
                      <Label htmlFor="topic">Session Topic *</Label>
                      <Input
                        id="topic"
                        name="topic"
                        value={formData.topic}
                        onChange={handleInputChange}
                        placeholder="e.g., Career advice for software engineering, Help with data structures project"
                        required
                      />
                      <p className="text-sm text-gray-500">
                        Briefly describe what you want to discuss
                      </p>
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                      <Label htmlFor="message">Detailed Message *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        placeholder="Please provide more details about what you need help with, your current situation, specific questions you have, or goals you want to achieve..."
                        rows={5}
                        className="resize-none"
                        required
                      />
                      <p className="text-sm text-gray-500">
                        Help the mentor understand how they can best assist you (minimum 20 characters)
                      </p>
                    </div>

                    {/* Preferred Format */}
                    <div className="space-y-2">
                      <Label>Preferred Format</Label>
                      <Select
                        value={formData.preferred_format}
                        onValueChange={(value) => handleSelectChange('preferred_format', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chat">
                            <div className="flex items-center space-x-2">
                              <MessageCircle className="h-4 w-4" />
                              <span>Text Chat</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="video">
                            <div className="flex items-center space-x-2">
                              <Video className="h-4 w-4" />
                              <span>Video Call</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                      <Label>Expected Duration</Label>
                      <Select
                        value={formData.duration}
                        onValueChange={(value) => handleSelectChange('duration', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sessionDurations.map((duration) => (
                            <SelectItem key={duration.value} value={duration.value.toString()}>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4" />
                                <span>{duration.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {error && (
                      <div className="rounded-md bg-red-50 p-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    {success && (
                      <div className="rounded-md bg-green-50 p-3">
                        <p className="text-sm text-green-800">{success}</p>
                      </div>
                    )}

                    <div className="flex justify-end space-x-3">
                      <Link href="/mentors/explore">
                        <Button type="button" variant="outline">
                          Cancel
                        </Button>
                      </Link>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Sending Request...' : 'Send Request'}
                      </Button>
                    </div>
                  </form>
                </div>
              </TabsContent>

              <TabsContent value="schedule">
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Instant Scheduling</h4>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Book an available time slot directly from the mentor's calendar. Your session will be confirmed immediately.
                    </p>
                  </div>
                  
                  <SessionScheduler 
                    mentorId={mentor.user_id}
                    studentId={user.id}
                    onScheduled={(sessionId, scheduledTime) => {
                      setSuccess(`Session scheduled successfully for ${scheduledTime.toLocaleDateString()} at ${scheduledTime.toLocaleTimeString()}!`)
                      setTimeout(() => {
                        router.push('/sessions')
                      }, 2000)
                    }}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    )
  }