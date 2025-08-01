'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { 
  Calendar,
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  Settings,
  ExternalLink,
  Check,
  X
} from 'lucide-react'
import { calendarService, type TimeSlot, generateTimeSlots } from '@/lib/calendar'
import { createClient } from '@/lib/supabase/client'

interface MentorAvailabilityProps {
  mentorId: string
}

export default function MentorAvailability({ mentorId }: MentorAvailabilityProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConnectedToGoogle, setIsConnectedToGoogle] = useState(false)
  const [newSlot, setNewSlot] = useState({
    startTime: '',
    endTime: '',
    isRecurring: false,
    recurringPattern: 'weekly' as 'daily' | 'weekly' | 'monthly',
    recurringEndDate: ''
  })

  const supabase = createClient()
  const timeOptions = generateTimeSlots(8, 22, 30) // 8 AM to 10 PM, 30-minute slots

  useEffect(() => {
    loadAvailability()
    checkGoogleCalendarConnection()
  }, [selectedDate, mentorId])

  const loadAvailability = async () => {
    setIsLoading(true)
    try {
      const slots = await calendarService.getMentorAvailability(mentorId, selectedDate)
      setTimeSlots(slots)
    } catch (error) {
      console.error('Error loading availability:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkGoogleCalendarConnection = async () => {
    try {
      const { data } = await supabase
        .from('user_calendar_integrations')
        .select('*')
        .eq('user_id', mentorId)
        .eq('provider', 'google')
        .eq('is_active', true)
        .single()

      setIsConnectedToGoogle(!!data)
    } catch (error) {
      setIsConnectedToGoogle(false)
    }
  }

  const connectGoogleCalendar = async () => {
    setIsLoading(true)
    try {
      const success = await calendarService.connectGoogleCalendar(mentorId)
      if (success) {
        setIsConnectedToGoogle(true)
        await syncWithGoogleCalendar()
      }
    } catch (error) {
      console.error('Error connecting Google Calendar:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const syncWithGoogleCalendar = async () => {
    setIsLoading(true)
    try {
      await calendarService.syncWithExternalCalendar(mentorId)
      await loadAvailability()
    } catch (error) {
      console.error('Error syncing with Google Calendar:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addTimeSlot = async () => {
    if (!newSlot.startTime || !newSlot.endTime) return

    const startTime = new Date(selectedDate)
    const [startHour, startMinute] = newSlot.startTime.split(':')
    startTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0)

    const endTime = new Date(selectedDate)
    const [endHour, endMinute] = newSlot.endTime.split(':')
    endTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0)

    if (endTime <= startTime) {
      alert('End time must be after start time')
      return
    }

    const slot: Omit<TimeSlot, 'id'> = {
      mentorId,
      startTime,
      endTime,
      isAvailable: true,
      isRecurring: newSlot.isRecurring,
      recurringPattern: newSlot.isRecurring ? newSlot.recurringPattern : undefined
    }

    setIsLoading(true)
    try {
      const success = await calendarService.setMentorAvailability(mentorId, [slot])
      if (success) {
        await loadAvailability()
        setNewSlot({
          startTime: '',
          endTime: '',
          isRecurring: false,
          recurringPattern: 'weekly',
          recurringEndDate: ''
        })
      }
    } catch (error) {
      console.error('Error adding time slot:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const removeTimeSlot = async (slotId: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('mentor_availability')
        .delete()
        .eq('id', slotId)

      if (!error) {
        await loadAvailability()
      }
    } catch (error) {
      console.error('Error removing time slot:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimeSlot = (slot: TimeSlot) => {
    const start = slot.startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    const end = slot.endTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    return `${start} - ${end}`
  }

  const getNextWeekDates = () => {
    const dates = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Manage Availability</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Set your available time slots for mentorship sessions
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {isConnectedToGoogle ? (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <Check className="h-3 w-3 mr-1" />
                    Google Calendar Connected
                  </Badge>
                  <Button variant="outline" size="sm" onClick={syncWithGoogleCalendar} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={connectGoogleCalendar} disabled={isLoading}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect Google Calendar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="weekly">Weekly View</TabsTrigger>
          <TabsTrigger value="daily">Daily View</TabsTrigger>
          <TabsTrigger value="add">Add Availability</TabsTrigger>
        </TabsList>

        {/* Weekly View */}
        <TabsContent value="weekly">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {getNextWeekDates().map((date, index) => {
              const daySlots = timeSlots.filter(slot => 
                slot.startTime.toDateString() === date.toDateString()
              )
              
              return (
                <Card key={index} className={`${date.toDateString() === selectedDate.toDateString() ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="text-center">
                      <div className="text-sm font-medium">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-lg font-bold">
                        {date.getDate()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {daySlots.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          No availability
                        </p>
                      ) : (
                        daySlots.map((slot) => (
                          <div key={slot.id} className="flex items-center justify-between">
                            <div className={`text-xs px-2 py-1 rounded ${
                              slot.isAvailable 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {formatTimeSlot(slot)}
                            </div>
                            {slot.isAvailable && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => removeTimeSlot(slot.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Daily View */}
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </CardTitle>
                <Input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="w-auto"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {timeSlots.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No availability set for this day</p>
                  </div>
                ) : (
                  timeSlots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatTimeSlot(slot)}</span>
                        <Badge variant={slot.isAvailable ? 'secondary' : 'destructive'}>
                          {slot.isAvailable ? 'Available' : 'Booked'}
                        </Badge>
                        {slot.isRecurring && (
                          <Badge variant="outline">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {slot.recurringPattern}
                          </Badge>
                        )}
                      </div>
                      
                      {slot.isAvailable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTimeSlot(slot.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add Availability */}
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Add New Availability</CardTitle>
              <p className="text-sm text-muted-foreground">
                Create new time slots for students to book sessions
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">Start Time</Label>
                  <Select value={newSlot.startTime} onValueChange={(value) => setNewSlot({...newSlot, startTime: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={`${time.hour}:${time.minute}`} value={`${time.hour}:${time.minute.toString().padStart(2, '0')}`}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="end-time">End Time</Label>
                  <Select value={newSlot.endTime} onValueChange={(value) => setNewSlot({...newSlot, endTime: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={`${time.hour}:${time.minute}`} value={`${time.hour}:${time.minute.toString().padStart(2, '0')}`}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="recurring"
                  checked={newSlot.isRecurring}
                  onCheckedChange={(checked) => setNewSlot({...newSlot, isRecurring: checked})}
                />
                <Label htmlFor="recurring">Make this a recurring slot</Label>
              </div>

              {newSlot.isRecurring && (
                <div>
                  <Label>Recurring Pattern</Label>
                  <Select value={newSlot.recurringPattern} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setNewSlot({...newSlot, recurringPattern: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button onClick={addTimeSlot} disabled={isLoading || !newSlot.startTime || !newSlot.endTime}>
                <Plus className="h-4 w-4 mr-2" />
                Add Time Slot
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}