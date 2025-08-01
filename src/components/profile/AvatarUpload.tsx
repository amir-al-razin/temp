'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Upload, X } from 'lucide-react'

interface AvatarUploadProps {
  currentUrl?: string | null
  onUpload: (url: string) => void
  userId: string
  userName?: string
}

export default function AvatarUpload({ currentUrl, onUpload, userId, userName }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = fileName

      console.log('Uploading file:', { fileName, filePath, bucketName: 'avatars' })

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Allow overwriting existing files
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      console.log('Upload successful:', uploadData)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      console.log('Generated public URL:', publicUrl)

      // Test if the URL is accessible
      try {
        const response = await fetch(publicUrl, { method: 'HEAD' })
        if (!response.ok) {
          throw new Error(`Image URL not accessible: ${response.status}`)
        }
      } catch (fetchError) {
        console.error('URL accessibility test failed:', fetchError)
        setError('Image uploaded but not accessible. Please check storage bucket configuration.')
        return
      }

      onUpload(publicUrl)
    } catch (err: any) {
      console.error('Avatar upload error:', err)
      setError(err.message || 'Failed to upload image')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    if (!currentUrl) return

    try {
      // Extract file path from URL
      const urlParts = currentUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const filePath = fileName // Just the filename, not avatars/filename

      // Delete from storage
      await supabase.storage
        .from('avatars')
        .remove([filePath])

      onUpload('')
    } catch (err) {
      // Silently handle removal errors
      onUpload('')
    }
  }

  const getInitials = () => {
    if (userName) {
      return userName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return 'U'
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className="h-24 w-24">
        <AvatarImage src={currentUrl || undefined} alt="Profile picture" />
        <AvatarFallback className="text-lg">
          {getInitials()}
        </AvatarFallback>
      </Avatar>

      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? 'Uploading...' : currentUrl ? 'Change' : 'Upload'}
        </Button>

        {currentUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={isUploading}
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <p className="text-xs text-gray-500 text-center">
        Upload a profile picture (max 5MB)
      </p>
    </div>
  )
}