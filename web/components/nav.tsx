'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationBell } from '@/components/notification-bell'
import { Avatar } from '@/components/avatar'
import type { User } from '@supabase/supabase-js'

function ConvexPiLogo({ showWordmark = true }: { showWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center overflow-hidden rounded-sm bg-background">
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
  const [username, setUsername] = useState<string | null>(null)
  const [githubUsername, setGithubUsername] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase
          .from('profiles')
          .select('username, github_username')
          .eq('id', data.user.id)
          .single()
          .then(({ data: p }) => {
            setUsername(p?.username ?? null)
            setGithubUsername(p?.github_username ?? null)
          })
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single()
          .then(({ data: p }) => setUsername(p?.username ?? null))
      } else {
        setUsername(null)
        setGithubUsername(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const isActive = (href: string) => pathname.startsWith(href)

  // Grouped navigation. Dashboard lives only in the right-hand auth area (not duplicated here).
  const navGroups = [
    {
      label: 'Learn',
      items: [
        { href: '/getting-started', label: 'Get started' },
        ...(user ? [{ href: '/tutor', label: 'Tutor' }] : []),
      ],
    },
    {
      label: 'Research',
      items: [
        { href: '/research',     label: 'Factor research' },
        { href: '/papers',       label: 'Papers' },
        { href: '/anomalies',    label: 'Anomaly graveyard' },
        { href: '/replications', label: 'Replications' },
      ],
    },
    {
      label: 'Practice',
      items: [
        { href: '/playground', label: 'Playground' },
        { href: '/compete',    label: 'Competitions' },
        { href: '/agents',     label: 'Agent arena' },
      ],
    },
    {
      label: 'Community',
      items: [
        { href: '/contributors', label: 'Contributors' },
        { href: '/community',     label: 'Researchers' },
      ],
    },
  ]
  const singleLinks: { href: string; label: string }[] = []

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
        <nav className="hidden md:flex items-center gap-1">
          {navGroups.map((group) => {
            const groupActive = group.items.some((i) => isActive(i.href))
            return (
              <DropdownMenu key={group.label}>
                <DropdownMenuTrigger
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium outline-none transition-colors hover:text-primary data-[popup-open]:text-primary ${
                    groupActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {group.label}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-44">
                  {group.items.map((item) => (
                    <DropdownMenuItem
                      key={item.href}
                      render={<Link href={item.href} />}
                      className={isActive(item.href) ? 'text-primary' : ''}
                    >
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          })}
          {singleLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:text-primary ${
                isActive(href) ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop auth buttons */}
        <div className="hidden md:flex ml-auto items-center gap-2">
          <a
            href="https://github.com/convexpi/lab"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Source on GitHub"
            className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
          {user ? (
            <>
              <NotificationBell />
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              {username && (
                <Link href={`/profile/${username}`} title={`Profile: @${username}`}>
                  <Avatar
                    username={username}
                    githubUsername={githubUsername}
                    size={28}
                    className="hover:ring-2 hover:ring-primary/40 transition-all"
                  />
                </Link>
              )}
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
                {navGroups.map((group) => (
                  <div key={group.label} className="mb-2">
                    <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                      {group.label}
                    </p>
                    {group.items.map(({ href, label }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                          isActive(href) ? 'bg-muted text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                ))}
                {singleLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                      isActive(href) ? 'bg-muted text-primary' : 'text-muted-foreground'
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
                    {username && (
                      <Link href={`/profile/${username}`} onClick={() => setMobileOpen(false)}>
                        <Button variant="ghost" className="w-full">My profile</Button>
                      </Link>
                    )}
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
