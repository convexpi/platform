import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Notifications — ConvexPi' }

type Notification = {
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
        ? ` — OOS Sharpe ${n.payload.oos_sharpe > 0 ? '+' : ''}${(n.payload.oos_sharpe as number).toFixed(3)}`
        : ''
      return {
        text: `"${n.payload.strategy_name}" was graded${sharpe}`,
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
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all notifications (no limit)
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const notifications = (data ?? []) as Notification[]
  const unread = notifications.filter(n => !n.read).length

  // Mark all as read (fire-and-forget — do on server load)
  if (unread > 0) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  }

  // Group by date
  const groups: { label: string; items: Notification[] }[] = []
  for (const n of notifications) {
    const d = new Date(n.created_at)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
    const label = diffDays === 0 ? 'Today'
      : diffDays === 1 ? 'Yesterday'
      : diffDays < 7 ? 'This week'
      : diffDays < 30 ? 'This month'
      : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const last = groups[groups.length - 1]
    if (last?.label === label) {
      last.items.push(n)
    } else {
      groups.push({ label, items: [n] })
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-primary uppercase mb-2">Inbox</p>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          {unread > 0 && (
            <p className="text-sm text-muted-foreground mt-1">{unread} unread</p>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm font-medium text-foreground mb-1">All caught up</p>
          <p className="text-xs text-muted-foreground">
            You&apos;ll see notifications here when someone follows you or your strategy is graded.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(group => (
            <div key={group.label}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                {group.label}
              </p>
              <div className="rounded-xl border overflow-hidden">
                {group.items.map((n, i) => {
                  const { text, href } = formatNotification(n)
                  return (
                    <Link
                      key={n.id}
                      href={href}
                      className={`flex items-start gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors ${i > 0 ? 'border-t' : ''} ${!n.read ? 'bg-primary/5' : ''}`}
                    >
                      <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${!n.read ? 'bg-primary' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-relaxed">{text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
