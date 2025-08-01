'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { calendarService, type TimeSlot, formatTimeSlot } from '@/lib/calendar'
import { createClient } from '@/lib/supabase/client'

interface SessionSchedulerProps {
  mentorId: string
  studentId: string
  onScheduled?: (sessionId: string, scheduledTime: Date) => void
}

export default function SessionScheduler({ mentorId, studentId, onScheduled }: SessionSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'select-time' | 'session-details' | 'confirmation'>('select-time')
  const [mentor, setMentor] = useState<any>(null)
  const [sessionDetails, setSessionDetails] = useState({
    topic: '',
    message: '',
    duration: 60,
    format: 'chat' as 'chat' | 'video'
  })

  const supabase = createClient()

  useEffect(() => {
    loadMentorInfo()
    loadAvailableSlots()
  }, [mentorId, selectedDate])

  const loadMentorInfo = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', mentorId)
        .single()

      setMentor(data)
    } catch (error) {
      console.error('Error loading mentor info:', error)
    }
  }

  const loadAvailableSlots = async () => {
    setIsLoading(true)
    try {
      const slots = await calendarService.getMentorAvailability(mentorId, selectedDate)
      const availableOnly = slots.filter(slot => slot.isAvailable && !slot.sessionId)
      setAvailableSlots(availableOnly)
    } catch (error) {
      console.error('Error loading available slots:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const scheduleSession = async () => {
    if (!selectedSlot) return

    setIsLoading(true)
    try {
      // Create the session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          student_id: studentId,
          mentor_id: mentorId,
          topic: sessionDetails.topic,
          message: sessionDetails.message,
          preferred_format: sessionDetails.format,
          duration: sessionDetails.duration,
          status: 'scheduled'
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // Create the schedule
      const { error: scheduleError } = await supabase
        .from('session_schedules')
        .insert({
          session_id: session.id,
          scheduled_start: selectedSlot.startTime.toISOString(),
          scheduled_end: selectedSlot.endTime.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          availability_slot_id: selectedSlot.id,
          created_by: studentId
        })

      if (scheduleError) throw scheduleError

      // Book the time slot
      await calendarService.bookTimeSlot(selectedSlot.id, session.id, studentId)

      // Create calendar events for both participants
      const eventDetails = {
        title: `Mentorship Session: ${sessionDetails.topic}`,
        description: `${sessionDetails.message}\n\nFormat: ${sessionDetails.format}\nDuration: ${sessionDetails.duration} minutes`,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        sessionId: session.id,
        attendees: [mentor?.email].filter(Boolean)
      }

      // Create calendar event for mentor
      await calendarService.createCalendarEvent(mentorId, eventDetails)

      // Create calendar event for student (if they have calendar integration)
      await calendarService.createCalendarEvent(studentId, eventDetails)

      setStep('confirmation')
      onScheduled?.(session.id, selectedSlot.startTime)

    } catch (error) {
      console.error('Error scheduling session:', error)
      alert('Failed to schedule session. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getWeekDates = () => {
    const dates = []
    const startOfWeek = new Date(selectedDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day
    startOfWeek.setDate(diff)

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7))
    setSelectedDate(newDate)
  }

  if (step === 'confirmation') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Session Scheduled!</h3>
          <p className="text-muted-foreground text-center mb-4">
            Your mentorship session has been successfully scheduled with {mentor?.full_name}
          </p>
          <div className="bg-muted rounded-lg p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div><strong>Topic:</strong> {sessionDetails.topic}</div>
              <div><strong>Date:</strong> {selectedSlot?.startTime.toLocaleDateString()}</div>
              <div><strong>Time:</strong> {selectedSlot && formatTimeSlot(selectedSlot)}</div>
              <div><strong>Duration:</strong> {sessionDetails.duration} minutes</div>
              <div><strong>Format:</strong> {sessionDetails.format === 'chat' ? 'Text Chat' : 'Video Call'}</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            You'll receive a reminder notification before the session starts.
            Calendar events have been created for both participants.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Schedule Session with {mentor?.full_name}</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Select an available time slot and provide session details
          </p>
        </CardHeader>
      </Card>

      {step === 'select-time' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Select Date & Time</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Week Calendar */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {getWeekDates().map((date, index) => {
                const isSelected = date.toDateString() === selectedDate.toDateString()
                const isToday = date.toDateString() === new Date().toDateString()
                const daySlots = availableSlots.filter(slot => 
                  slot.startTime.toDateString() === date.toDateString()
                )

                return (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className={`text-lg font-semibold ${isToday ? 'text-primary' : ''}`}>
                        {date.getDate()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {daySlots.length} slots
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Available Time Slots */}
            <div>
              <h4 className="font-medium mb-3">
                Available Times - {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h4>
              
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading available slots...</p>
                </div>
              ) : availableSlots.filter(slot => 
                slot.startTime.toDateString() === selectedDate.toDateString()
              ).length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No available slots for this date</p>
                  <p className="text-sm text-muted-foreground">Try selecting a different date</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {availableSlots
                    .filter(slot => slot.startTime.toDateString() === selectedDate.toDateString())
                    .map((slot) => (
                      <Button
                        key={slot.id}
                        variant={selectedSlot?.id === slot.id ? 'default' : 'outline'}
                        className="h-auto p-3"
                        onClick={() => setSelectedSlot(slot)}
                      >
                        <div className="text-center">
                          <Clock className="h-4 w-4 mx-auto mb-1" />
                          <div className="text-sm font-medium">
                            {formatTimeSlot(slot)}
                          </div>
                        </div>
                      </Button>
                    ))}
                </div>
              )}
            </div>

            {selectedSlot && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Selected Time Slot</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSlot.startTime.toLocaleDateString()} at {formatTimeSlot(selectedSlot)}
                    </p>
                  </div>
                  <Button onClick={() => setStep('session-details')}>
                    Continue
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'session-details' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Session Details</CardTitle>
              <Button variant="ghost" onClick={() => setStep('select-time')}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selected Time Summary */}
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {selectedSlot?.startTime.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSlot && formatTimeSlot(selectedSlot)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="topic">Session Topic *</Label>
              <Input
                id="topic"
                placeholder="What would you like help with?"
                value={sessionDetails.topic}
                onChange={(e) => setSessionDetails({...sessionDetails, topic: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="message">Message to Mentor</Label>
              <Textarea
                id="message"
                placeholder="Provide more details about what you'd like to discuss..."
                value={sessionDetails.message}
                onChange={(e) => setSessionDetails({...sessionDetails, message: e.target.value})}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select value={sessionDetails.duration.toString()} onValueChange={(value) => setSessionDetails({...sessionDetails, duration: parseInt(value)})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">120 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="format">Session Format</Label>
                <Select value={sessionDetails.format} onValueChange={(value: 'chat' | 'video') => setSessionDetails({...sessionDetails, format: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chat">Text Chat</SelectItem>
                    <SelectItem value="video">Video Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setStep('select-time')}>
                Back
              </Button>
              <Button 
                onClick={scheduleSession} 
                disabled={isLoading || !sessionDetails.topic}
              >
                {isLoading ? 'Scheduling...' : 'Schedule Session'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}