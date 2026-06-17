import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const NAV = [
  { href: '/admin',             label: 'Overview',    icon: '◈' },
  { href: '/admin/users',       label: 'Users',       icon: '◉' },
  { href: '/admin/submissions', label: 'Submissions', icon: '◎' },
  { href: '/admin/cohorts',     label: 'Cohorts',     icon: '⬡' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // First-run: ADMIN_USER_IDS not yet configured — show setup prompt instead of 404
  const adminIdsConfigured = !!(process.env.ADMIN_USER_IDS ?? '').trim()
  if (!user) redirect('/login?next=/admin')
  if (!adminIdsConfigured) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="max-w-md w-full rounded-xl border bg-card p-8">
          <h1 className="text-xl font-semibold mb-2">Admin setup</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Set the <code className="font-mono bg-muted px-1 py-0.5 rounded">ADMIN_USER_IDS</code> environment
            variable to your Supabase user ID to enable the admin panel.
          </p>
          <div className="rounded-lg bg-muted p-3 mb-4">
            <p className="text-xs text-muted-foreground mb-1">Your user ID</p>
            <code className="font-mono text-sm break-all select-all">{user.id}</code>
          </div>
          <p className="text-xs text-muted-foreground">
            Add <code className="font-mono">ADMIN_USER_IDS={user.id}</code> to your Railway and Vercel
            environment variables, then redeploy.
          </p>
        </div>
      </div>
    )
  }
  if (!isAdmin(user.id)) redirect('/')

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r bg-secondary/30 flex flex-col">
        <div className="px-4 py-5 border-b">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Admin</p>
        </div>
        <nav className="flex flex-col gap-0.5 p-2 flex-1">
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <span className="text-xs opacity-60">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to site
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
