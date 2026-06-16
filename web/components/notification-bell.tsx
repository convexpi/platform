'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  type: string
  payload: Record<string, string | number | null>
  read: boolean
  created_at: string
}

function formatNotification(n: Notification): { text: string; href: string } {
  switch (n.type) {
    case 'new_follower':
      return {
        text: `@${n.payload.follower_username ?? 'Someone'} started following you`,
        href: `/profile/${n.payload.follower_username ?? ''}`,
      }
    case 'submission_graded': {
      const sharpe = typeof n.payload.oos_sharpe === 'number'
        ? ` — OOS Sharpe ${n.payload.oos_sharpe > 0 ? '+' : ''}${n.payload.oos_sharpe.toFixed(3)}`
        : ''
      return {
        text: `"${n.payload.strategy_name}" graded${sharpe}`,
        href: '/dashboard',
      }
    }
    default:
      return { text: 'New notification', href: '/dashboard' }
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  async function fetchNotifications() {
    const res = await fetch('/api/notifications')
    if (!res.ok) return
    const data = await res.json()
    setNotifications(data.notifications ?? [])
    setUnread(data.unread ?? 0)
  }

  useEffect(() => {
    fetchNotifications()

    // Realtime: listen for new notifications
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session?.user) return
      const channel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        }, () => fetchNotifications())
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleOpen() {
    setOpen(o => !o)
    if (!open && unread > 0) {
      startTransition(async () => {
        await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        setUnread(0)
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      })
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 text-[10px] font-bold rounded-full bg-primary text-primary-foreground flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-xl border bg-background shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-sm font-semibold hover:text-primary transition-colors">
              Notifications
            </Link>
            {notifications.length > 0 && (
              <button
                onClick={() => {
                  fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
                  setUnread(0)
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground text-center">No notifications yet.</p>
            ) : (
              notifications.map(n => {
                const { text, href } = formatNotification(n)
                return (
                  <Link
                    key={n.id}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/40 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                  >
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${!n.read ? 'bg-primary' : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-relaxed">{text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BellIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
