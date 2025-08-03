'use client'

import { motion } from 'framer-motion'
import { ExternalLink, MessageCircle, User, MapPin, Clock, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { SearchResults as SearchResultsType, Mentor, ExternalProfile } from '@/types'
import Link from 'next/link'
import Image from 'next/image'

interface SearchResultsProps {
  results: SearchResultsType
  query: string
  onStartOver: () => void
}

export default function SearchResults({ results, query, onStartOver }: SearchResultsProps) {
  const totalResults = (results.internal?.length || 0) + (results.external?.length || 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Search Results</h2>
          <p className="text-muted-foreground">
            Found {totalResults} mentors for &quot;{query}&quot;
          </p>
        </div>
        <Button variant="outline" onClick={onStartOver}>
          New Search
        </Button>
      </div>

      <div className="space-y-8">
        {/* Internal Platform Mentors */}
        {results.internal && results.internal.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Platform Mentors ({results.internal.length})</h3>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results.internal.map((mentor, index) => (
                <InternalMentorCard key={mentor.id} mentor={mentor} index={index} />
              ))}
            </div>
          </motion.section>
        )}

        {/* External Profiles */}
        {results.external && results.external.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="h-8 w-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                <ExternalLink className="h-4 w-4 text-secondary-foreground" />
              </div>
              <h3 className="text-lg font-semibold">External Profiles ({results.external.length})</h3>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results.external.map((profile, index) => (
                <ExternalProfileCard key={`${profile.platform}-${index}`} profile={profile} index={index} />
              ))}
            </div>
          </motion.section>
        )}

        {/* No Results */}
        {totalResults === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No mentors found</h3>
            <p className="text-muted-foreground mb-4">
              Try refining your search with different keywords or expanding your criteria.
            </p>
            <Button onClick={onStartOver}>Try Another Search</Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function InternalMentorCard({ mentor, index }: { mentor: Mentor; index: number }) {
  const profile = mentor.profiles

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500'
      case 'busy': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getAvailabilityText = (status: string) => {
    switch (status) {
      case 'available': return 'Available'
      case 'busy': return 'Busy'
      default: return 'Offline'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || 'Mentor'} />
            <AvatarFallback>
              {profile.full_name ? getInitials(profile.full_name) : 'M'}
            </AvatarFallback>
          </Avatar>
          <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background ${getAvailabilityColor(mentor.availability_status)}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold truncate">{profile.full_name || 'Anonymous Mentor'}</h4>
          <p className="text-sm text-muted-foreground truncate">{mentor.role_title}</p>
          {profile.department && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{profile.department}</span>
            </div>
          )}
        </div>
      </div>

      {mentor.expertise_tags && mentor.expertise_tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {mentor.expertise_tags.slice(0, 3).map((tag, tagIndex) => (
            <Badge key={tagIndex} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {mentor.expertise_tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{mentor.expertise_tags.length - 3} more
            </Badge>
          )}
        </div>
      )}

      {profile.bio && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {profile.bio}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{getAvailabilityText(mentor.availability_status)}</span>
        </div>
        
        <Button size="sm" asChild>
          <Link href={`/mentors/${mentor.id}`}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Connect
          </Link>
        </Button>
      </div>

      {/* {mentor.relevance_score !== undefined && mentor.relevance_score > 0 && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t">
          <Star className="h-3 w-3 text-yellow-500" />
          <span className="text-xs text-muted-foreground">
            Relevance: {Math.min(5, Math.max(1, Math.round(mentor.relevance_score)))}/5
          </span>
        </div>
      )} */}
    </motion.div>
  )
}

function ExternalProfileCard({ profile, index }: { profile: ExternalProfile; index: number }) {
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'linkedin': return '💼'
      case 'facebook': return '👤'
      case 'scholar': return '🎓'
      default: return '🌐'
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'linkedin': return 'bg-blue-600'
      case 'facebook': return 'bg-blue-500'
      case 'scholar': return 'bg-green-600'
      default: return 'bg-gray-600'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          {profile.image ? (
            <Image
              src={profile.image}
              alt={profile.name || 'Profile'}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background ${getPlatformColor(profile.platform)} flex items-center justify-center text-xs`}>
            {getPlatformIcon(profile.platform)}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold truncate">{profile.name || 'Unknown'}</h4>
          {profile.title && (
            <p className="text-sm text-muted-foreground truncate">{profile.title}</p>
          )}
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-muted-foreground capitalize">{profile.platform}</span>
          </div>
        </div>
      </div>

      {profile.snippet && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {profile.snippet}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs capitalize">
          {profile.platform}
        </Badge>
        
        <Button size="sm" variant="outline" asChild>
          <a href={profile.link} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Profile
          </a>
        </Button>
      </div>

      {profile.relevance_score !== undefined && profile.relevance_score > 0 && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t">
          <Star className="h-3 w-3 text-yellow-500" />
          <span className="text-xs text-muted-foreground">
            Relevance: {Math.min(5, Math.max(1, Math.round(profile.relevance_score)))}/5
          </span>
        </div>
      )}
    </motion.div>
  )
}