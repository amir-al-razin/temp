'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import type { Message, User } from '@/types'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  currentUser: User
}

export default function MessageBubble({ message, isOwn, currentUser }: MessageBubbleProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  // Special rendering for system messages
  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center my-4">
        <div className="max-w-md">
          <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-center">
            <div className="text-sm">
              <p className="font-medium text-gray-900 dark:text-gray-100">{message.content}</p>
              
              {/* Video Call Start */}
              {message.metadata?.type === 'video_call' && message.metadata?.jitsi_link && (
                <div className="mt-3">
                  {(() => {
                    // Determine if current user is mentor or student
                    const isMentor = currentUser.id === message.metadata?.mentor_id
                    const isStudent = currentUser.id === message.metadata?.student_id
                    
                    // Get appropriate link based on user role
                    let joinLink = message.metadata.jitsi_link
                    let buttonText = 'Join Video Call'
                    let buttonStyle = 'bg-green-600 hover:bg-green-700'
                    
                    if (isMentor && message.metadata.mentor_link) {
                      joinLink = message.metadata.mentor_link
                      buttonText = 'Join as Moderator'
                      buttonStyle = 'bg-blue-600 hover:bg-blue-700'
                    } else if (isStudent && message.metadata.student_link) {
                      joinLink = message.metadata.student_link
                      buttonText = 'Join Video Call'
                      buttonStyle = 'bg-green-600 hover:bg-green-700'
                    }
                    
                    return (
                      <a 
                        href={joinLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`inline-flex items-center space-x-2 px-4 py-2 ${buttonStyle} text-white rounded-md text-sm font-medium transition-colors`}
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                        <span>{buttonText}</span>
                        {isMentor && (
                          <svg className="h-4 w-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L3 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.277l-1.254.145a1 1 0 11-.992-1.736L14.984 6l-.23-.132a1 1 0 01-.372-1.364zM6 4a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zM16 10a1 1 0 01-1 1H9a1 1 0 110-2h6a1 1 0 011 1zM10 14a1 1 0 100 2h4a1 1 0 100-2h-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </a>
                    )
                  })()}
                </div>
              )}

              {/* Video Call End */}
              {message.metadata?.type === 'video_call_ended' && (
                <div className="mt-3 p-2 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-2 text-red-800 dark:text-red-200 mb-1">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999c0-1.174.403-2.292 1.53-3.161C4.82.688 6.41.342 8.999.342c2.588 0 4.178.346 5.303 1.496 1.127.869 1.53 1.987 1.53 3.161 0 .63-.216 1.207-.566 1.707a3.956 3.956 0 01-1.536 1.26c.653.796 1.028 1.707 1.028 2.707 0 2.485-2.239 4.5-5 4.5s-5-2.015-5-4.5c0-1 .375-1.911 1.028-2.707a3.956 3.956 0 01-1.536-1.26c-.35-.5-.566-1.077-.566-1.707z" clipRule="evenodd" />
                        <path d="M13.5 12.268V16a.75.75 0 01-1.5 0v-3.732a2 2 0 00-1.732-1.732h-.536a2 2 0 00-1.732 1.732V16a.75.75 0 01-1.5 0v-3.732A3.5 3.5 0 019.732 9h.536a3.5 3.5 0 013.232 3.268z" />
                      </svg>
                      <span className="font-semibold">Video Call Ended</span>
                    </div>
                    
                    {message.metadata.call_duration && (
                      <div className="text-sm text-red-700 dark:text-red-300">
                        <span>Duration: {message.metadata.call_duration}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Session Completion */}
              {message.metadata?.type === 'session_completed' && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-2 text-green-800 dark:text-green-200 mb-2">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold">Session Summary</span>
                    </div>
                    
                    {message.metadata.session_summary && (
                      <div className="space-y-2 text-sm text-green-700 dark:text-green-300">
                        <div className="flex justify-between items-center">
                          <span>Duration:</span>
                          <span className="font-medium">{message.metadata.duration_text}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Topic:</span>
                          <span className="font-medium">{message.metadata.session_summary.topic}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Participants:</span>
                          <span className="font-medium">
                            {message.metadata.session_summary.participants?.filter(Boolean).join(' & ')}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 pt-2 border-t border-green-200 dark:border-green-700">
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Thank you for using Eagles Mentorship! 🎉
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {formatTime(message.created_at)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
        {!isOwn && (
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={message.sender?.avatar_url || undefined} 
              alt={message.sender?.full_name || 'User'} 
            />
            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
              {getInitials(message.sender?.full_name || 'User')}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={`${isOwn ? 'mr-2' : 'ml-2'}`}>
          <div
            className={`rounded-lg px-4 py-2 ${
              isOwn
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
            }`}
          >
            {message.message_type === 'text' && (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
            
            {message.message_type === 'file' && (
              <div className="text-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{message.content}</span>
                </div>
                {message.file_url && (
                  <a 
                    href={message.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`inline-flex items-center space-x-1 underline ${isOwn ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'}`}
                  >
                    <span>Download</span>
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                    </svg>
                  </a>
                )}
              </div>
            )}


          </div>
          
          <div className={`mt-1 text-xs text-gray-500 dark:text-gray-400 ${isOwn ? 'text-right' : 'text-left'}`}>
            {formatTime(message.created_at)}
          </div>
        </div>
      </div>
    </div>
  )
}