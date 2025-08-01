'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/auth'
import { X } from 'lucide-react'

interface MentorApplicationFormProps {
  user: User
  profile: Profile
  existingApplication?: any
}

const commonExpertiseAreas = [
  'Web Development',
  'Mobile Development',
  'Data Science',
  'Machine Learning',
  'Cybersecurity',
  'Software Engineering',
  'Database Design',
  'UI/UX Design',
  'Project Management',
  'Research Methods',
  'Academic Writing',
  'Career Planning',
  'Internship Preparation',
  'Interview Skills',
  'Leadership',
  'Entrepreneurship'
]

export default function MentorApplicationForm({ 
  user, 
  profile, 
  existingApplication 
}: MentorApplicationFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    expertise_tags: existingApplication?.expertise_tags || [],
    achievements: existingApplication?.achievements || '',
    current_role: existingApplication?.role_title || '',
    bio: existingApplication?.bio || profile.bio || ''
  })

  const [newExpertise, setNewExpertise] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
    setSuccess(null)
  }

  const addExpertiseTag = (tag: string) => {
    if (tag && !formData.expertise_tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        expertise_tags: [...prev.expertise_tags, tag]
      }))
    }
    setNewExpertise('')
  }

  const removeExpertiseTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      expertise_tags: prev.expertise_tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addExpertiseTag(newExpertise.trim())
    }
  }

  const validateForm = () => {
    if (formData.expertise_tags.length === 0) {
      setError('Please add at least one area of expertise')
      return false
    }
    
    if (!formData.achievements.trim()) {
      setError('Please describe your achievements')
      return false
    }
    
    if (!formData.current_role.trim()) {
      setError('Please describe your current role or status')
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
      const applicationData = {
        user_id: user.id,
        expertise_tags: formData.expertise_tags,
        achievements: formData.achievements.trim(),
        role_title: formData.current_role.trim(),
        status: 'pending'
      }

      if (existingApplication) {
        // Update existing application
        const { error } = await supabase
          .from('mentors')
          .update(applicationData)
          .eq('id', existingApplication.id)

        if (error) throw error
        setSuccess('Your mentor application has been updated successfully!')
      } else {
        // Create new application
        const { error } = await supabase
          .from('mentors')
          .insert([applicationData])

        if (error) throw error
        setSuccess('Your mentor application has been submitted successfully!')
      }

      // Redirect to dashboard after a delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (err: any) {
      setError(err.message || 'Failed to submit application. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Show status if application exists
  if (existingApplication && existingApplication.status !== 'rejected') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mentor Application Status</CardTitle>
          <CardDescription>
            Your mentor application is currently being reviewed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={existingApplication.status === 'approved' ? 'default' : 'secondary'}>
                {existingApplication.status === 'pending' ? 'Under Review' : 
                 existingApplication.status === 'approved' ? 'Approved' : 
                 existingApplication.status}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <span className="text-sm font-medium">Areas of Expertise:</span>
              <div className="flex flex-wrap gap-2">
                {existingApplication.expertise_tags.map((tag: string) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>

            {existingApplication.status === 'pending' && (
              <div className="mt-6">
                <p className="text-sm text-gray-600 mb-4">
                  Want to update your application? You can edit it below:
                </p>
                <Button
                  onClick={() => setSuccess(null)}
                  variant="outline"
                >
                  Edit Application
                </Button>
              </div>
            )}

            {existingApplication.status === 'approved' && (
              <div className="mt-6 p-4 bg-green-50 rounded-md">
                <p className="text-sm text-green-800">
                  Congratulations! Your mentor application has been approved. 
                  You can now start accepting mentorship requests from students.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {existingApplication ? 'Update Mentor Application' : 'Mentor Application'}
        </CardTitle>
        <CardDescription>
          Tell us about your expertise and experience to help us match you with the right students
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Areas of Expertise */}
          <div className="space-y-3">
            <Label>Areas of Expertise *</Label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  value={newExpertise}
                  onChange={(e) => setNewExpertise(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type an area of expertise and press Enter"
                />
                <Button
                  type="button"
                  onClick={() => addExpertiseTag(newExpertise.trim())}
                  disabled={!newExpertise.trim()}
                >
                  Add
                </Button>
              </div>
              
              <div className="text-sm text-gray-600">
                <p className="mb-2">Quick add:</p>
                <div className="flex flex-wrap gap-2">
                  {commonExpertiseAreas
                    .filter(area => !formData.expertise_tags.includes(area))
                    .slice(0, 8)
                    .map((area) => (
                    <Button
                      key={area}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addExpertiseTag(area)}
                    >
                      + {area}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            
            {formData.expertise_tags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Selected expertise areas:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.expertise_tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeExpertiseTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Current Role */}
          <div className="space-y-2">
            <Label htmlFor="current_role">Current Role/Status *</Label>
            <Input
              id="current_role"
              name="current_role"
              value={formData.current_role}
              onChange={handleInputChange}
              placeholder="e.g., Senior Computer Science Student, Research Assistant, Intern at..."
              required
            />
            <p className="text-sm text-gray-500">
              Describe your current academic year, job, internship, or research position
            </p>
          </div>

          {/* Achievements */}
          <div className="space-y-2">
            <Label htmlFor="achievements">Achievements & Experience *</Label>
            <Textarea
              id="achievements"
              name="achievements"
              value={formData.achievements}
              onChange={handleInputChange}
              placeholder="Describe your relevant achievements, projects, internships, research experience, awards, or any other accomplishments that demonstrate your expertise..."
              rows={5}
              className="resize-none"
              required
            />
            <p className="text-sm text-gray-500">
              Help students understand why you'd be a great mentor by sharing your accomplishments
            </p>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading 
                ? 'Submitting...' 
                : existingApplication 
                  ? 'Update Application' 
                  : 'Submit Application'
              }
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}