'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { ArrowLeft, Star } from 'lucide-react'
import Link from 'next/link'

interface FeedbackFormProps {
  session: any
  currentUser: User
  existingFeedback?: any
}

export default function FeedbackForm({ 
  session, 
  currentUser, 
  existingFeedback 
}: FeedbackFormProps) {
  const [rating, setRating] = useState(existingFeedback?.rating || 0)
  const [comment, setComment] = useState(existingFeedback?.comment || '')
  const [hoveredRating, setHoveredRating] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

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
      month: 'long',
      day: 'numeric'
    })
  }

  const validateForm = () => {
    if (rating === 0) {
      setError('Please select a rating')
      return false
    }
    
    if (!comment.trim()) {
      setError('Please provide feedback comments')
      return false
    }

    if (comment.trim().length < 10) {
      setError('Please provide more detailed feedback (at least 10 characters)')
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
      const feedbackData = {
        session_id: session.id,
        student_id: currentUser.id,
        mentor_id: session.mentor_id,
        rating,
        comment: comment.trim()
      }

      if (existingFeedback) {
        // Update existing feedback
        const { error } = await supabase
          .from('feedback')
          .update(feedbackData)
          .eq('id', existingFeedback.id)

        if (error) throw error
        setSuccess('Your feedback has been updated successfully!')
      } else {
        // Create new feedback
        const { error } = await supabase
          .from('feedback')
          .insert([feedbackData])

        if (error) throw error
        setSuccess('Thank you for your feedback!')
      }

      // Redirect to sessions page after a delay
      setTimeout(() => {
        router.push('/sessions')
      }, 2000)

    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const StarRating = () => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="p-1 transition-colors"
          >
            <Star
              className={`h-8 w-8 ${
                star <= (hoveredRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-3 text-sm text-gray-600">
          {rating > 0 && (
            <>
              {rating} star{rating !== 1 ? 's' : ''} - {
                rating === 1 ? 'Poor' :
                rating === 2 ? 'Fair' :
                rating === 3 ? 'Good' :
                rating === 4 ? 'Very Good' :
                'Excellent'
              }
            </>
          )}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center space-x-4">
        <Link href="/sessions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Button>
        </Link>
      </div>

      {/* Session Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Session Feedback</CardTitle>
          <CardDescription>
            Share your experience with this mentorship session
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage 
                src={session.mentor?.avatar_url || undefined} 
                alt={session.mentor?.full_name || 'Mentor'} 
              />
              <AvatarFallback>
                {getInitials(session.mentor?.full_name || 'Mentor')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium text-gray-900">{session.topic}</h3>
              <p className="text-sm text-gray-600">
                Mentored by {session.mentor?.full_name}
              </p>
              <p className="text-xs text-gray-500">
                Completed on {formatDate(session.completed_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {existingFeedback ? 'Update Your Feedback' : 'Rate Your Experience'}
          </CardTitle>
          <CardDescription>
            Your feedback helps improve the mentorship experience for everyone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900">
                Overall Rating *
              </label>
              <StarRating />
              <p className="text-sm text-gray-500">
                How would you rate your overall experience with this mentorship session?
              </p>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <label htmlFor="comment" className="text-sm font-medium text-gray-900">
                Feedback Comments *
              </label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts about the session. What went well? What could be improved? How did the mentor help you?"
                rows={6}
                className="resize-none"
                required
              />
              <p className="text-sm text-gray-500">
                Provide detailed feedback to help the mentor improve and assist future students
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
              <Link href="/sessions">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading 
                  ? 'Submitting...' 
                  : existingFeedback 
                    ? 'Update Feedback' 
                    : 'Submit Feedback'
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Existing Feedback Display */}
      {existingFeedback && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Feedback Submitted</CardTitle>
            <CardDescription className="text-green-700">
              You have already provided feedback for this session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-green-800">Rating:</span>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= existingFeedback.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-green-700">
                    ({existingFeedback.rating}/5)
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-green-800">Comments:</span>
                <p className="text-sm text-green-700 mt-1">{existingFeedback.comment}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}