'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import MentorSearchChat from '@/components/mentors/MentorSearchChat'
import SearchResults from '@/components/mentors/SearchResults'
import { SearchState, AISearchResponse, SearchPlatform } from '@/types'

export default function MentorSearchPage() {
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    isSearching: false,
    platforms: [],
    results: null,
    error: null,
    resumeUrl: null,
    step: 'input'
  })

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return

    setSearchState(prev => ({
      ...prev,
      query: query.trim(),
      isSearching: true,
      step: 'platform_selection',
      error: null
    }))

    try {
      const response = await fetch('http://localhost:5678/webhook-test/ai-mentor-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          step: 'initial'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: AISearchResponse = await response.json()

      if (data.success && data.step === 'platform_selection') {
        setSearchState(prev => ({
          ...prev,
          resumeUrl: data.resumeUrl || null,
          isSearching: false
        }))
      } else {
        throw new Error(data.error || 'Failed to process search query')
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchState(prev => ({
        ...prev,
        isSearching: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        step: 'input'
      }))
    }
  }, [])

  const handlePlatformSelection = useCallback(async (selectedPlatforms: string[]) => {
    if (!searchState.resumeUrl) {
      setSearchState(prev => ({
        ...prev,
        error: 'No resume URL available. Please start a new search.'
      }))
      return
    }

    setSearchState(prev => ({
      ...prev,
      platforms: selectedPlatforms,
      isSearching: true,
      step: 'searching'
    }))

    try {
      const response = await fetch(searchState.resumeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchState.query,
          platforms: selectedPlatforms,
          step: 'search'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: AISearchResponse = await response.json()

      if (data.success && data.data) {
        setSearchState(prev => ({
          ...prev,
          results: data.data || null,
          isSearching: false,
          step: 'results'
        }))
      } else {
        throw new Error(data.error || 'Failed to get search results')
      }
    } catch (error) {
      console.error('Platform selection error:', error)
      setSearchState(prev => ({
        ...prev,
        isSearching: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        step: 'platform_selection'
      }))
    }
  }, [searchState.resumeUrl, searchState.query])

  const handleStartOver = useCallback(() => {
    setSearchState({
      query: '',
      isSearching: false,
      platforms: [],
      results: null,
      error: null,
      resumeUrl: null,
      step: 'input'
    })
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Dashboard</span>
                </Link>
              </Button>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-lg font-semibold">AI Mentor Search</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {searchState.step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Find Your Perfect Mentor</h2>
                <p className="text-muted-foreground">
                  Describe what you&apos;re looking for and we&apos;ll help you find mentors from IUT and beyond
                </p>
              </div>
              
              <MentorSearchChat 
                onSendMessage={handleSearch}
                isLoading={searchState.isSearching}
              />

              {searchState.error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
                >
                  <p className="text-destructive text-sm">{searchState.error}</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {searchState.step === 'platform_selection' && (
            <motion.div
              key="platform_selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <PlatformSelector
                query={searchState.query}
                onSelectionConfirm={handlePlatformSelection}
                onStartOver={handleStartOver}
                isLoading={searchState.isSearching}
              />

              {searchState.error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
                >
                  <p className="text-destructive text-sm">{searchState.error}</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {searchState.step === 'searching' && (
            <motion.div
              key="searching"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center py-12"
            >
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Searching for mentors...</h3>
              <p className="text-muted-foreground">
                We&apos;re looking through our platform and the web to find the best matches for you
              </p>
            </motion.div>
          )}

          {searchState.step === 'results' && searchState.results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SearchResults
                results={searchState.results}
                query={searchState.query}
                onStartOver={handleStartOver}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Placeholder components - will be implemented in next tasks
function PlatformSelector({ 
  query, 
  onSelectionConfirm, 
  onStartOver, 
  isLoading 
}: {
  query: string
  onSelectionConfirm: (platforms: string[]) => void
  onStartOver: () => void
  isLoading: boolean
}) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin', 'facebook', 'scholar'])

  const platforms: SearchPlatform[] = [
    { id: 'linkedin', name: 'LinkedIn', description: 'Professional networking profiles', icon: 'linkedin' },
    { id: 'facebook', name: 'Facebook', description: 'Social media profiles', icon: 'facebook' },
    { id: 'scholar', name: 'Google Scholar', description: 'Academic profiles and publications', icon: 'graduation-cap' }
  ]

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Choose Search Platforms</h2>
        <p className="text-muted-foreground mb-4">
          Select which platforms to search for mentors related to: &quot;{query}&quot;
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {platforms.map((platform) => (
          <label
            key={platform.id}
            className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedPlatforms.includes(platform.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedPlatforms(prev => [...prev, platform.id])
                } else {
                  setSelectedPlatforms(prev => prev.filter(p => p !== platform.id))
                }
              }}
              className="rounded"
            />
            <div className="flex-1">
              <div className="font-medium">{platform.name}</div>
              <div className="text-sm text-muted-foreground">{platform.description}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="flex gap-4 justify-center">
        <Button variant="outline" onClick={onStartOver} disabled={isLoading}>
          Start Over
        </Button>
        <Button 
          onClick={() => onSelectionConfirm(selectedPlatforms)}
          disabled={selectedPlatforms.length === 0 || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Searching...
            </>
          ) : (
            'Search Mentors'
          )}
        </Button>
      </div>
    </div>
  )
}

