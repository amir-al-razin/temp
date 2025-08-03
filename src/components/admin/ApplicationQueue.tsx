'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Mail, GraduationCap, Calendar } from 'lucide-react'
import type { Mentor } from '@/types'

interface ApplicationQueueProps {
  applications: Mentor[]
}

export default function ApplicationQueue({ applications }: ApplicationQueueProps) {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleApplicationAction = async (applicationId: string, action: 'approved' | 'rejected') => {
    setProcessingIds(prev => new Set(prev).add(applicationId))
    setError(null)

    try {
      const updateData: {
        status: string
        updated_at: string
        approved_at?: string
      } = {
        status: action,
        updated_at: new Date().toISOString()
      }

      if (action === 'approved') {
        updateData.approved_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('mentors')
        .update(updateData)
        .eq('id', applicationId)

      if (error) throw error

      // Refresh the page to show updated data
      router.refresh()
    } catch (err) {
      const error = err as Error
      setError(error.message || `Failed to ${action} application`)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(applicationId)
        return newSet
      })
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <GraduationCap className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Applications</h3>
          <p className="text-gray-500 text-center">
            All mentor applications have been reviewed. New applications will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="grid gap-6">
        {applications.map((application) => (
          <Card key={application.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage 
                      src={application.profiles.avatar_url || undefined} 
                      alt={application.profiles.full_name || 'User'} 
                    />
                    <AvatarFallback>
                      {getInitials(application.profiles.full_name || 'User')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl">
                      {application.profiles.full_name}
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-4 mt-1">
                      <span className="flex items-center">
                        <Mail className="h-4 w-4 mr-1" />
                        {application.profiles.email}
                      </span>
                      <span className="flex items-center">
                        <GraduationCap className="h-4 w-4 mr-1" />
                        {application.profiles.department} - Year {application.profiles.year}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Applied {formatDate(application.created_at)}
                      </span>
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">Pending Review</Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Current Role */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Current Role</h4>
                <p className="text-gray-700">{application.role_title}</p>
              </div>

              {/* Expertise Areas */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Areas of Expertise</h4>
                <div className="flex flex-wrap gap-2">
                  {application.expertise_tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Achievements */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Achievements & Experience</h4>
                <div className="bg-gray-50 rounded-md p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {application.achievements}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleApplicationAction(application.id, 'rejected')}
                  disabled={processingIds.has(application.id)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  {processingIds.has(application.id) ? 'Processing...' : 'Reject'}
                </Button>
                <Button
                  onClick={() => handleApplicationAction(application.id, 'approved')}
                  disabled={processingIds.has(application.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {processingIds.has(application.id) ? 'Processing...' : 'Approve'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}