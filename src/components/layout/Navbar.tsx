'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Sun, 
  Moon, 
  User, 
  Settings, 
  LogOut, 
  Home,
  Users,
  MessageCircle,
  Calendar,
  GraduationCap,
  BarChart3
} from 'lucide-react'
import { signOut, getCurrentUser, getUserProfile } from '@/lib/auth'
import { isAdmin } from '@/lib/auth-server'
import NotificationBell from './NotificationBell'
import Link from 'next/link'

interface NavbarProps {
  currentPath?: string
}

export default function Navbar({ currentPath }: NavbarProps) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
        const userProfile = await getUserProfile(currentUser.id)
        setProfile(userProfile)
        
        // Check if user is admin (this would need to be done server-side in a real app)
        // For now, we'll use the email-based check
        const adminStatus = userProfile?.email?.includes('admin') || false
        setIsUserAdmin(adminStatus)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/auth')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  if (!mounted) {
    return null // Prevent hydration mismatch
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Mentors', href: '/mentors/explore', icon: Users },
    { name: 'Sessions', href: '/sessions', icon: MessageCircle },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Chat History', href: '/chat/history', icon: MessageCircle },
    { name: 'Apply as Mentor', href: '/mentors/apply', icon: GraduationCap },
  ]

  const adminNavigation = [
    { name: 'Admin Dashboard', href: '/admin/dashboard', icon: BarChart3 },
    { name: 'Applications', href: '/admin/applications', icon: Users },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-lg font-bold text-sm">
                E
              </div>
              <span className="font-bold text-xl text-foreground">Eagles</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1 ml-8">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = currentPath === item.href
                return (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden lg:inline">{item.name}</span>
                    </Button>
                  </Link>
                )
              })}

              {/* Admin Navigation */}
              {isUserAdmin && (
                <>
                  <div className="h-4 w-px bg-border mx-2" />
                  {adminNavigation.map((item) => {
                    const Icon = item.icon
                    const isActive = currentPath === item.href
                    return (
                      <Link key={item.name} href={item.href}>
                        <Button
                          variant={isActive ? "default" : "ghost"}
                          size="sm"
                          className="flex items-center space-x-2 text-orange-600 hover:text-orange-700"
                        >
                          <Icon className="h-4 w-4" />
                          <span className="hidden lg:inline">{item.name}</span>
                        </Button>
                      </Link>
                    )
                  })}
                </>
              )}
            </div>
          </div>

          {/* Right side - Notifications, Theme toggle and Profile */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            {user && <NotificationBell userId={user.id} />}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-9 h-9 p-0"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Profile Dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage 
                        src={profile?.avatar_url || undefined} 
                        alt={profile?.full_name || user.email} 
                      />
                      <AvatarFallback>
                        {profile?.full_name 
                          ? getInitials(profile.full_name)
                          : user.email?.[0]?.toUpperCase() || 'U'
                        }
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile?.full_name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      {isUserAdmin && (
                        <p className="text-xs leading-none text-orange-600 font-medium">
                          Administrator
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link href="/notifications" className="flex items-center">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      <span>Notifications</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>

                  {/* Mobile Navigation Items */}
                  <div className="md:hidden">
                    <DropdownMenuSeparator />
                    {navigation.map((item) => {
                      const Icon = item.icon
                      return (
                        <DropdownMenuItem key={item.name} asChild>
                          <Link href={item.href} className="flex items-center">
                            <Icon className="mr-2 h-4 w-4" />
                            <span>{item.name}</span>
                          </Link>
                        </DropdownMenuItem>
                      )
                    })}

                    {isUserAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        {adminNavigation.map((item) => {
                          const Icon = item.icon
                          return (
                            <DropdownMenuItem key={item.name} asChild>
                              <Link href={item.href} className="flex items-center text-orange-600">
                                <Icon className="mr-2 h-4 w-4" />
                                <span>{item.name}</span>
                              </Link>
                            </DropdownMenuItem>
                          )
                        })}
                      </>
                    )}
                  </div>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}