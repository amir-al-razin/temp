'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()

  // Don't show navbar on auth pages
  const hideNavbar = pathname === '/auth' || pathname === '/'

  if (hideNavbar) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar currentPath={pathname} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}