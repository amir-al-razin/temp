'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Search, 
  Filter,
  Trash2,
  MessageCircle,
  Calendar,
  Award,
  AlertCircle
} from 'lucide-react'
import { notificationService, type Notification } from '@/lib/notifications'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface NotificationCenterProps {
  userId: string
}

export default function NotificationCenter({ userId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState('all')
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    loadNotifications()
    
    // Subscribe to real-time notifications
    const unsubscribe = notificationService.subscribeToNotifications(userId, (notification) => {
      setNotifications(prev => [notification, ...prev])
    })

    return unsubscribe
  }, [userId])

  useEffect(() => {
    filterNotifications()
  }, [notifications, searchQuery, selectedTab])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await notificationService.getNotifications(userId, 100)
      setNotifications(data)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterNotifications = () => {
    let filtered = notifications

    // Filter by tab
    if (selectedTab === 'unread') {
      filtered = filtered.filter(n => !n.read_at)
    } else if (selectedTab !== 'all') {
      filtered = filtered.filter(n => n.type === selectedTab)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      )
    }

    setFilteredNotifications(filtered)
  }

  const handleMarkAsRead = async (notificationIds: string[]) => {
    try {
      await notificationService.markAsRead(notificationIds)
      setNotifications(prev => 
        prev.map(n => 
          notificationIds.includes(n.id) 
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      )
      setSelectedNotifications(new Set())
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(userId)
      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
      )
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleDeleteSelected = async () => {
    try {
      const promises = Array.from(selectedNotifications).map(id => 
        notificationService.deleteNotification(id)
      )
      await Promise.all(promises)
      
      setNotifications(prev => 
        prev.filter(n => !selectedNotifications.has(n.id))
      )
      setSelectedNotifications(new Set())
    } catch (error) {
      console.error('Error deleting notifications:', error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read_at) {
      await handleMarkAsRead([notification.id])
    }

    // Navigate based on notification type
    const actionUrl = getActionUrl(notification)
    if (actionUrl) {
      router.push(actionUrl)
    }
  }

  const getActionUrl = (notification: Notification) => {
    switch (notification.type) {
      case 'session_request':
      case 'session_accepted':
      case 'session_declined':
        return '/sessions'
      case 'message_received':
        return notification.data?.session_id ? `/chat/${notification.data.session_id}` : '/sessions'
      case 'session_completed':
        return notification.data?.session_id ? `/feedback/${notification.data.session_id}` : '/sessions'
      case 'mentor_approved':
        return '/mentors/explore'
      default:
        return null
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'session_request':
        return <Calendar className="h-5 w-5 text-blue-600" />
      case 'session_accepted':
        return <Check className="h-5 w-5 text-green-600" />
      case 'session_declined':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'message_received':
        return <MessageCircle className="h-5 w-5 text-blue-600" />
      case 'session_completed':
        return <CheckCheck className="h-5 w-5 text-green-600" />
      case 'mentor_approved':
        return <Award className="h-5 w-5 text-purple-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    
    return date.toLocaleDateString()
  }

  const unreadCount = notifications.filter(n => !n.read_at).length
  const selectedCount = selectedNotifications.size

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          {unreadCount > 0 && (
            <Badge variant="secondary">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedCount > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAsRead(Array.from(selectedNotifications))}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark Read ({selectedCount})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedCount})
              </Button>
            </>
          )}
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Notification Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="session_request">Sessions</TabsTrigger>
          <TabsTrigger value="message_received">Messages</TabsTrigger>
          <TabsTrigger value="mentor_approved">Mentorship</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchQuery ? 'No matching notifications' : 'No notifications'}
                </h3>
                <p className="text-muted-foreground text-center">
                  {searchQuery 
                    ? 'Try adjusting your search terms'
                    : 'You\'ll see notifications here when you have activity'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => {
                const isSelected = selectedNotifications.has(notification.id)
                const actionUrl = getActionUrl(notification)
                
                return (
                  <Card 
                    key={notification.id} 
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      !notification.read_at ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : ''
                    } ${isSelected ? 'ring-2 ring-primary' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSelected = new Set(selectedNotifications)
                            if (e.target.checked) {
                              newSelected.add(notification.id)
                            } else {
                              newSelected.delete(notification.id)
                            }
                            setSelectedNotifications(newSelected)
                          }}
                          className="mt-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className={`text-sm font-medium ${!notification.read_at ? 'font-semibold' : ''}`}>
                                  {notification.title}
                                </h4>
                                {!notification.read_at && (
                                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-muted-foreground">
                                  {formatTime(notification.created_at)}
                                </p>
                                {actionUrl && (
                                  <Link href={actionUrl} onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="sm" className="text-xs h-6">
                                      View
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}