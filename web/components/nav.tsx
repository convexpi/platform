'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { User } from '@supabase/supabase-js'

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
        <Link href="/" className="flex items-center gap-1.5 shrink-0 select-none">
          <span className="font-serif text-xl leading-none text-foreground">C</span>
          <span className="font-serif text-xl leading-none text-[#3b82f6]">π</span>
          <span className="ml-1 text-sm font-medium tracking-wide text-foreground/80 hidden sm:inline">ConvexPi</span>
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
                <SheetTitle className="text-left flex items-center gap-1">
                  <span className="font-serif text-xl">C</span>
                  <span className="font-serif text-xl text-[#3b82f6]">π</span>
                  <span className="ml-1 text-sm font-medium">ConvexPi</span>
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
