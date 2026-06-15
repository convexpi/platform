'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { User } from '@supabase/supabase-js'

function ConvexPiLogo({ showWordmark = true }: { showWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center overflow-hidden rounded-sm bg-[#fcfaf9]">
      <Image
        src={showWordmark ? '/convexpi-logo.png' : '/convexpi-mark.png'}
        alt=""
        aria-hidden="true"
        width={showWordmark ? 608 : 246}
        height={204}
        className={showWordmark ? 'h-10 w-auto' : 'h-10 w-auto'}
        priority
      />
      <span className="sr-only">ConvexPi</span>
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
