'use client'

import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { SendIcon, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MentorSearchChatProps {
  onSendMessage: (message: string) => void
  isLoading: boolean
}

export default function MentorSearchChat({ onSendMessage, isLoading }: MentorSearchChatProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(() => {
    if (value.trim() && !isLoading) {
      onSendMessage(value.trim())
      setValue('')
    }
  }, [value, isLoading, onSendMessage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = '60px'
      const newHeight = Math.max(60, Math.min(textarea.scrollHeight, 200))
      textarea.style.height = `${newHeight}px`
    }
  }, [])

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        className="border-border bg-card/80 relative rounded-2xl border shadow-2xl backdrop-blur-2xl"
        initial={{ scale: 0.98 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              adjustHeight()
            }}
            onKeyDown={handleKeyDown}
            placeholder="I&apos;m looking for a mentor who can help me with machine learning and Python programming..."
            className={cn(
              'w-full px-4 py-3 resize-none bg-transparent border-none',
              'text-foreground text-sm focus:outline-none',
              'placeholder:text-muted-foreground min-h-[60px]'
            )}
            disabled={isLoading}
            style={{ overflow: 'hidden' }}
          />
        </div>

        <div className="border-border flex items-center justify-between gap-4 border-t p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>Describe your needs in detail for better matches</span>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isLoading || !value.trim()}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-all',
              'flex items-center gap-2',
              value.trim() && !isLoading
                ? 'bg-primary text-primary-foreground shadow-primary/10 shadow-lg'
                : 'bg-muted/50 text-muted-foreground'
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendIcon className="h-4 w-4" />
            )}
            <span>{isLoading ? 'Processing...' : 'Search'}</span>
          </Button>
        </div>
      </motion.div>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Try: &quot;I need help with web development using React and Node.js&quot; or &quot;Looking for a senior software engineer mentor&quot;
        </p>
      </div>
    </div>
  )
}