'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, Users, MessageCircle } from 'lucide-react'
import Link from 'next/link'

interface Mentor {
  id: string
  user_id: string
  expertise_tags: string[]
  achievements: string
  role_title: string
  availability_status: string
  approved_at: string
  profiles: {
    id: string
    email: string
    full_name: string
    department: string
    year: number
    avatar_url?: string
    bio?: string
  }
}

interface MentorGridProps {
  mentors: Mentor[]
  availableExpertise: string[]
  availableDepartments: string[]
}

export default function MentorGrid({ 
  mentors, 
  availableExpertise, 
  availableDepartments 
}: MentorGridProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExpertise, setSelectedExpertise] = useState<string>('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  const filteredMentors = useMemo(() => {
    return mentors.filter(mentor => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = mentor.profiles.full_name.toLowerCase().includes(query)
        const matchesBio = mentor.profiles.bio?.toLowerCase().includes(query) || false
        const matchesRole = mentor.role_title.toLowerCase().includes(query)
        const matchesExpertise = mentor.expertise_tags.some(tag => 
          tag.toLowerCase().includes(query)
        )
        
        if (!matchesName && !matchesBio && !matchesRole && !matchesExpertise) {
          return false
        }
      }

      // Expertise filter
      if (selectedExpertise && selectedExpertise !== 'all' && !mentor.expertise_tags.includes(selectedExpertise)) {
        return false
      }

      // Department filter
      if (selectedDepartment && selectedDepartment !== 'all' && mentor.profiles.department !== selectedDepartment) {
        return false
      }

      return true
    })
  }, [mentors, searchQuery, selectedExpertise, selectedDepartment])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedExpertise('')
    setSelectedDepartment('')
  }

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
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'busy':
        return 'bg-yellow-100 text-yellow-800'
      case 'offline':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAvailabilityText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available'
      case 'busy':
        return 'Busy'
      case 'offline':
        return 'Offline'
      default:
        return 'Unknown'
    }
  }

  if (mentors.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Mentors Available</h3>
          <p className="text-gray-500 text-center">
            There are currently no approved mentors on the platform. Check back later!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search mentors by name, expertise, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </Button>

              {(selectedExpertise || selectedDepartment) && (
                <Button variant="ghost" onClick={clearFilters} size="sm">
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expertise Area</label>
                  <Select value={selectedExpertise} onValueChange={setSelectedExpertise}>
                    <SelectTrigger>
                      <SelectValue placeholder="All expertise areas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All expertise areas</SelectItem>
                      {availableExpertise.map((expertise) => (
                        <SelectItem key={expertise} value={expertise}>
                          {expertise}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Department</label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All departments</SelectItem>
                      {availableDepartments.map((department) => (
                        <SelectItem key={department} value={department}>
                          {department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredMentors.length} of {mentors.length} mentors
        </p>
      </div>

      {/* Mentors Grid */}
      {filteredMentors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Mentors Found</h3>
            <p className="text-gray-500 text-center">
              Try adjusting your search criteria or filters to find mentors.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMentors.map((mentor) => (
            <Card key={mentor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage 
                        src={mentor.profiles.avatar_url || undefined} 
                        alt={mentor.profiles.full_name} 
                      />
                      <AvatarFallback>
                        {getInitials(mentor.profiles.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {mentor.profiles.full_name}
                      </CardTitle>
                      <CardDescription>
                        {mentor.profiles.department} • Year {mentor.profiles.year}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge 
                    className={`text-xs ${getAvailabilityColor(mentor.availability_status)}`}
                    variant="secondary"
                  >
                    {getAvailabilityText(mentor.availability_status)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Current Role */}
                <div>
                  <p className="text-sm font-medium text-gray-900">Current Role</p>
                  <p className="text-sm text-gray-600">{mentor.role_title}</p>
                </div>

                {/* Expertise Tags */}
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Expertise</p>
                  <div className="flex flex-wrap gap-1">
                    {mentor.expertise_tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {mentor.expertise_tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{mentor.expertise_tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Bio Preview */}
                {mentor.profiles.bio && (
                  <div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {mentor.profiles.bio}
                    </p>
                  </div>
                )}

                {/* Action Button */}
                <div className="pt-2">
                  <Link href={`/sessions/request/${mentor.user_id}`}>
                    <Button className="w-full" size="sm">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Request Session
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}