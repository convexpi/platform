'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { User } from '@supabase/supabase-js'

function ConvexPiLogo({ showWordmark = true }: { showWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        aria-hidden="true"
        viewBox="0 0 84 54"
        className="h-9 w-14 shrink-0 overflow-visible"
      >
        <path
          d="M52.5 10.5c-5.1-4.2-12-6.2-20.7-5.9C17.2 5.1 7.7 14.9 7.7 28.9c0 13.1 9.1 21.6 22.7 21.6 8.4 0 15.6-2.8 21.5-8.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          className="text-foreground"
        />
        <text
          x="30"
          y="37"
          fill="#C9A34E"
          className="font-serif"
          fontSize="30"
          fontWeight="700"
        >
          π
        </text>
        <path
          d="M12 45.5h62"
          fill="none"
          stroke="#0B1F3A"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.25"
        />
        <path
          d="M17 44.5c13.1-.3 24.5-3.1 34-10.5 8-6.2 13.9-14.2 18.7-25.7"
          fill="none"
          stroke="#0B1F3A"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d="M69.8 8.4v37.1"
          fill="none"
          stroke="#0B1F3A"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.2"
        />
        <circle cx="69.8" cy="8.4" r="4.2" fill="#C9A34E" />
      </svg>
      {showWordmark && (
        <span className="font-serif text-xl leading-none text-foreground">
          ConvexPi
        </span>
      )}
    </span>
  )
}

export function Nav() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const isActive = (href: string) => pathname.startsWith(href)

  const navLinks = [
    { href: '/getting-started', label: 'Get started' },
    { href: '/compete',         label: 'Compete' },
    { href: '/seasons',         label: 'Seasons' },
    { href: '/anomalies',       label: 'Anomalies' },
    ...(user ? [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/tutor',     label: 'Tutor' },
    ] : []),
  ]

  const handleSignOut = () =>
    supabase.auth.signOut().then(() => (window.location.href = '/'))

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center gap-4 px-4">

        {/* Logo */}
        <Link href="/" className="shrink-0 select-none" aria-label="ConvexPi home">
          <span className="hidden sm:inline-flex">
            <ConvexPiLogo />
          </span>
          <span className="inline-flex sm:hidden">
            <ConvexPiLogo showWordmark={false} />
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-4">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive(href) ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop auth buttons */}
        <div className="hidden md:flex ml-auto items-center gap-2">
          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
              <Link href="/signup"><Button size="sm">Get started</Button></Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex md:hidden ml-auto">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <ConvexPiLogo />
                </SheetTitle>
              </SheetHeader>

              <nav className="mt-6 flex flex-col gap-1">
                {navLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                      isActive(href)
                        ? 'bg-muted text-primary'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              <div className="mt-6 flex flex-col gap-2 border-t pt-6">
                {user ? (
                  <>
                    <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full">Dashboard</Button>
                    </Link>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => { setMobileOpen(false); handleSignOut() }}
                    >
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full">Sign in</Button>
                    </Link>
                    <Link href="/signup" onClick={() => setMobileOpen(false)}>
                      <Button className="w-full">Get started</Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  )
}
