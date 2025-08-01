'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface JitsiTrackerProps {
  sessionId: string
  currentUserId: string
  roomName: string
  onCallEnd: (duration: string) => void
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any
  }
}

export default function JitsiTracker({ sessionId, currentUserId, roomName, onCallEnd }: JitsiTrackerProps) {
  const apiRef = useRef<any>(null)
  const participantsRef = useRef<Set<string>>(new Set())
  const callStartTimeRef = useRef<Date>(new Date())
  const supabase = createClient()

  useEffect(() => {
    // Load Jitsi Meet External API script
    const loadJitsiAPI = () => {
      if (window.JitsiMeetExternalAPI) {
        initializeJitsiAPI()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://meet.jit.si/external_api.js'
      script.onload = initializeJitsiAPI
      document.head.appendChild(script)
    }

    const initializeJitsiAPI = () => {
      // Create a hidden div for the Jitsi API (we're only using it for tracking)
      const jitsiContainer = document.createElement('div')
      jitsiContainer.id = `jitsi-tracker-${sessionId}`
      jitsiContainer.style.display = 'none'
      document.body.appendChild(jitsiContainer)

      // Initialize Jitsi Meet External API for tracking
      apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName: roomName,
        parentNode: jitsiContainer,
        configOverwrite: {
          startWithAudioMuted: true,
          startWithVideoMuted: true,
          enableWelcomePage: false,
          prejoinPageEnabled: false
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: []
        }
      })

      // Track participant events
      apiRef.current.addEventListener('participantJoined', (participant: any) => {
        console.log('Participant joined:', participant)
        participantsRef.current.add(participant.id)
        updateCallStatus('active')
      })

      apiRef.current.addEventListener('participantLeft', (participant: any) => {
        console.log('Participant left:', participant)
        participantsRef.current.delete(participant.id)
        
        // Check if all participants have left
        if (participantsRef.current.size === 0) {
          handleCallEnd()
        }
      })

      apiRef.current.addEventListener('videoConferenceJoined', (participant: any) => {
        console.log('User joined conference:', participant)
        participantsRef.current.add(participant.id)
        callStartTimeRef.current = new Date()
        updateCallStatus('active')
      })

      apiRef.current.addEventListener('videoConferenceLeft', () => {
        console.log('User left conference')
        handleCallEnd()
      })

      apiRef.current.addEventListener('readyToClose', () => {
        console.log('Jitsi ready to close')
        handleCallEnd()
      })
    }

    const updateCallStatus = async (status: 'active' | 'ended') => {
      try {
        // Update call status in database or localStorage
        const callData = {
          sessionId,
          status,
          participants: Array.from(participantsRef.current),
          lastUpdate: new Date().toISOString()
        }
        localStorage.setItem(`jitsi-status-${sessionId}`, JSON.stringify(callData))
      } catch (error) {
        console.error('Error updating call status:', error)
      }
    }

    const handleCallEnd = async () => {
      const endTime = new Date()
      const duration = calculateDuration(callStartTimeRef.current, endTime)
      
      // Clean up
      participantsRef.current.clear()
      localStorage.removeItem(`jitsi-status-${sessionId}`)
      
      // Notify parent component
      onCallEnd(duration)
      
      // Clean up API
      if (apiRef.current) {
        apiRef.current.dispose()
        apiRef.current = null
      }
      
      // Remove hidden container
      const container = document.getElementById(`jitsi-tracker-${sessionId}`)
      if (container) {
        container.remove()
      }
    }

    const calculateDuration = (startTime: Date, endTime: Date): string => {
      const durationMs = endTime.getTime() - startTime.getTime()
      const durationMinutes = Math.floor(durationMs / (1000 * 60))
      const durationHours = Math.floor(durationMinutes / 60)
      const remainingMinutes = durationMinutes % 60

      if (durationHours > 0) {
        return `${durationHours}h ${remainingMinutes}m`
      } else {
        return `${durationMinutes}m`
      }
    }

    loadJitsiAPI()

    // Cleanup on unmount
    return () => {
      if (apiRef.current) {
        apiRef.current.dispose()
      }
      const container = document.getElementById(`jitsi-tracker-${sessionId}`)
      if (container) {
        container.remove()
      }
      localStorage.removeItem(`jitsi-status-${sessionId}`)
    }
  }, [sessionId, roomName, currentUserId, onCallEnd])

  return null // This component doesn't render anything visible
}