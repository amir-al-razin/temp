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
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { 
  Sun, 
  Moon, 
  User as UserIcon, 
  Settings, 
  LogOut, 
  Users,
  MessageCircle,
  Calendar,
  GraduationCap,
  BarChart3,
  Activity,
  FileText,
  Shield,
  Sparkles
} from 'lucide-react'
import { signOut, getCurrentUser, getUserProfile } from '@/lib/auth'
import NotificationBell from './NotificationBell'
import { StarBorder } from '@/components/ui/start-border'
import { User, Profile } from '@/types'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface NavbarProps {
  currentPath?: string
}

export default function Navbar({ currentPath }: NavbarProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
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

  // Activities dropdown items
  const activitiesItems = [
    {
      title: 'Sessions',
      href: '/sessions',
      description: 'View and manage your mentorship sessions',
      icon: MessageCircle
    },
    {
      title: 'Chat History',
      href: '/chat/history',
      description: 'Access your past conversations',
      icon: FileText
    }
  ]



  // Mentorship dropdown items
  const mentorshipItems = [
    {
      title: 'Calendar',
      href: '/calendar',
      description: 'Schedule and manage your mentorship sessions',
      icon: Calendar
    },
    {
      title: 'Apply as Mentor',
      href: '/mentors/apply',
      description: 'Share your knowledge with other students',
      icon: GraduationCap
    }
  ]

  // Admin dropdown items
  const adminItems = [
    {
      title: 'Admin Dashboard',
      href: '/admin/dashboard',
      description: 'Platform overview and statistics',
      icon: BarChart3
    },
    {
      title: 'Applications',
      href: '/admin/applications',
      description: 'Review mentor applications',
      icon: Users
    },
    {
      title: 'Analytics',
      href: '/admin/analytics',
      description: 'Detailed platform analytics',
      icon: Activity
    }
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2 mr-8">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-lg font-bold text-sm">
                E
              </div>
              <span className="font-bold text-xl text-foreground">Eagles</span>
            </Link>

            {/* Desktop Navigation Menu */}
            <div className="hidden md:flex">
              <NavigationMenu viewport={false}>
                <NavigationMenuList>
                  {/* Activities Dropdown */}
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>Activities</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-1">
                        {activitiesItems.map((item) => (
                          <ListItem
                            key={item.title}
                            title={item.title}
                            href={item.href}
                            icon={item.icon}
                          >
                            {item.description}
                          </ListItem>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  {/* Mentors */}
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                      <Link href="/mentors/explore">Mentors</Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>

                  {/* Mentorship Dropdown */}
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>Mentorship</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-1">
                        {mentorshipItems.map((item) => (
                          <ListItem
                            key={item.title}
                            title={item.title}
                            href={item.href}
                            icon={item.icon}
                          >
                            {item.description}
                          </ListItem>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  {/* Admin Dropdown - Only visible to admins */}
                  {isUserAdmin && (
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="text-orange-600 hover:text-orange-700">
                        <Shield className="h-4 w-4 mr-2" />
                        Admin
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="grid w-[400px] gap-3 p-1">
                          {adminItems.map((item) => (
                            <ListItem
                              key={item.title}
                              title={item.title}
                              href={item.href}
                              icon={item.icon}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              {item.description}
                            </ListItem>
                          ))}
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  )}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>

          {/* Right side - AI Search, Notifications, Theme toggle and Profile */}
          <div className="flex items-center space-x-4">
            {/* AI Search Button */}
            {user && (
              <StarBorder as={Link} href="/mentors/search" className="no-underline">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Search with AI</span>
                </div>
              </StarBorder>
            )}

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
                        alt={profile?.full_name || user.email || 'User'} 
                      />
                      <AvatarFallback>
                        {profile?.full_name 
                          ? getInitials(profile.full_name)
                          : (user.email?.[0]?.toUpperCase() || 'U')
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
                        {user.email || 'No email'}
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
                      <UserIcon className="mr-2 h-4 w-4" />
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
                    <DropdownMenuItem asChild>
                      <Link href="/sessions" className="flex items-center">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        <span>Sessions</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/chat/history" className="flex items-center">
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Chat History</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/mentors/explore" className="flex items-center">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Mentors</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/calendar" className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Calendar</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/mentors/apply" className="flex items-center">
                        <GraduationCap className="mr-2 h-4 w-4" />
                        <span>Apply as Mentor</span>
                      </Link>
                    </DropdownMenuItem>

                    {isUserAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin/dashboard" className="flex items-center text-orange-600">
                            <BarChart3 className="mr-2 h-4 w-4" />
                            <span>Admin Dashboard</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/applications" className="flex items-center text-orange-600">
                            <Users className="mr-2 h-4 w-4" />
                            <span>Applications</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/analytics" className="flex items-center text-orange-600">
                            <Activity className="mr-2 h-4 w-4" />
                            <span>Analytics</span>
                          </Link>
                        </DropdownMenuItem>
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

// Helper component for navigation menu items
function ListItem({
  title,
  children,
  href,
  icon: Icon,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { 
  href: string
  icon?: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link 
          href={href}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
        >
          <div className="flex items-center space-x-2">
            {Icon && <Icon className="h-4 w-4" />}
            <div className="text-sm font-medium leading-none">{title}</div>
          </div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}