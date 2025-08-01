'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { SessionManager } from '@/lib/session-actions'
import Link from 'next/link'

interface SessionActionsProps {
  session: any
  currentUserId: string
  isStudent: boolean
}

export default function SessionActions({ session, currentUserId, isStudent }: SessionActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const sessionManager = new SessionManager()

  const handleAccept = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await sessionManager.acceptSession(session.id, currentUserId)
      router.refresh() // Refresh to show updated status
    } catch (err: any) {
      setError(err.message || 'Failed to accept session')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDecline = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await sessionManager.declineSession(session.id, currentUserId)
      router.refresh() // Refresh to show updated status
    } catch (err: any) {
      setError(err.message || 'Failed to decline session')
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await sessionManager.completeSession(session.id, currentUserId)
      router.refresh() // Refresh to show updated status
    } catch (err: any) {
      setError(err.message || 'Failed to complete session')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex justify-end space-x-3 pt-4 border-t">
      {error && (
        <div className="w-full mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Mentor can accept/decline requested sessions */}
      {session.status === 'requested' && !isStudent && (
        <>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDecline}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Decline'}
          </Button>
          <Button 
            size="sm"
            onClick={handleAccept}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Accept'}
          </Button>
        </>
      )}
      
      {/* Both can access chat when session is accepted or in progress */}
      {(session.status === 'accepted' || session.status === 'in_progress') && (
        <>
          <Link href={`/chat/${session.id}`}>
            <Button size="sm">
              <MessageCircle className="h-4 w-4 mr-2" />
              Open Chat
            </Button>
          </Link>
          {session.status === 'in_progress' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleComplete}
              disabled={isLoading}
            >
              {isLoading ? 'Completing...' : 'Complete Session'}
            </Button>
          )}
        </>
      )}
      
      {/* Student can leave feedback for completed sessions */}
      {session.status === 'completed' && isStudent && (
        <Link href={`/feedback/${session.id}`}>
          <Button variant="outline" size="sm">
            Leave Feedback
          </Button>
        </Link>
      )}

      {/* Show status for declined sessions */}
      {session.status === 'declined' && (
        <div className="text-sm text-muted-foreground">
          This session was declined
        </div>
      )}
    </div>
  )
}