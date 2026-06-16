import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin — ConvexPi' }

function StatCard({ label, value, sub, href }: { label: string; value: string | number; sub?: string; href?: string }) {
  const inner = (
    <div className="rounded-xl border bg-card p-5 hover:border-primary/30 transition-colors">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-mono font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default async function AdminOverview() {
  const db = createAdminClient()

  const [
    { count: userCount },
    { count: submissionCount },
    { count: pendingCount },
    { count: failedCount },
    { count: cohortCount },
    { count: followCount },
    { data: recentSubmissions },
    { data: recentUsers },
    { data: dailyStats },
  ] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('submissions').select('*', { count: 'exact', head: true }),
    db.from('submissions').select('*', { count: 'exact', head: true }).in('status', ['pending', 'running']),
    db.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    db.from('cohorts').select('*', { count: 'exact', head: true }),
    db.from('follows').select('*', { count: 'exact', head: true }),
    db.from('submissions')
      .select('id, strategy_name, status, submitted_at, profiles(username), cohorts(name, slug, type)')
      .order('submitted_at', { ascending: false })
      .limit(10),
    db.from('profiles')
      .select('id, username, display_name, university, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    // Submissions per day for last 14 days
    db.from('submissions')
      .select('submitted_at, status')
      .gte('submitted_at', new Date(Date.now() - 14 * 86400_000).toISOString())
      .order('submitted_at', { ascending: true }),
  ])

  // Group submissions by day
  const byDay: Record<string, { total: number; completed: number; failed: number }> = {}
  for (const s of dailyStats ?? []) {
    const day = s.submitted_at.slice(0, 10)
    if (!byDay[day]) byDay[day] = { total: 0, completed: 0, failed: 0 }
    byDay[day].total++
    if (s.status === 'completed') byDay[day].completed++
    if (s.status === 'failed') byDay[day].failed++
  }
  const days = Object.entries(byDay).slice(-14)

  type SubRow = {
    id: string; strategy_name: string; status: string; submitted_at: string
    profiles: { username: string } | null
    cohorts: { name: string; slug: string; type: string } | null
  }
  const subs = (recentSubmissions ?? []) as unknown as SubRow[]

  const statusColor: Record<string, string> = {
    completed: 'text-emerald-600 bg-emerald-50',
    failed:    'text-red-600 bg-red-50',
    running:   'text-blue-600 bg-blue-50',
    pending:   'text-amber-600 bg-amber-50',
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">Overview</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-10">
        <StatCard label="Total users"       value={userCount ?? 0}      href="/admin/users" />
        <StatCard label="Total submissions" value={submissionCount ?? 0} href="/admin/submissions" />
        <StatCard label="Queued / running"  value={pendingCount ?? 0}   sub="needs grader" href="/admin/submissions?status=pending" />
        <StatCard label="Failed"            value={failedCount ?? 0}    sub="grader errors" href="/admin/submissions?status=failed" />
        <StatCard label="Cohorts"           value={cohortCount ?? 0}    href="/admin/cohorts" />
        <StatCard label="Follows"           value={followCount ?? 0} />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        {/* Recent submissions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Recent submissions</h2>
            <Link href="/admin/submissions" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all →
            </Link>
          </div>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Strategy</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Cohort</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subs.map(s => {
                  const base = s.cohorts?.type === 'competition' ? '/compete' : '/classroom'
                  return (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium truncate max-w-[140px]">{s.strategy_name}</td>
                      <td className="px-4 py-2.5">
                        {s.profiles?.username ? (
                          <Link href={`/profile/${s.profiles.username}`}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                            @{s.profiles.username}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[120px]">
                        {s.cohorts ? (
                          <Link href={`${base}/${s.cohorts.slug}`}
                            className="hover:text-foreground transition-colors">
                            {s.cohorts.name}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[s.status] ?? 'text-muted-foreground'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-muted-foreground tabular-nums">
                        {timeAgo(s.submitted_at)}
                      </td>
                    </tr>
                  )
                })}
                {subs.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No submissions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Activity chart */}
          {days.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-4">Submissions — last 14 days</h2>
              <div className="rounded-xl border p-4 bg-card">
                <div className="flex items-end gap-1 h-20">
                  {days.map(([day, d]) => {
                    const maxDay = Math.max(...days.map(([, x]) => x.total), 1)
                    const pct = (d.total / maxDay) * 100
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className="w-full bg-primary/20 hover:bg-primary/40 rounded-sm transition-colors cursor-default"
                          style={{ height: `${Math.max(pct, 4)}%` }}
                          title={`${day}: ${d.total} total, ${d.completed} graded, ${d.failed} failed`}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{days[0]?.[0]?.slice(5)}</span>
                  <span>{days[days.length - 1]?.[0]?.slice(5)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent users */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">New users</h2>
              <Link href="/admin/users" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                View all →
              </Link>
            </div>
            <div className="rounded-xl border overflow-hidden">
              {(recentUsers ?? []).map((u, i) => (
                <div key={u.id} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t' : ''} hover:bg-muted/30 transition-colors`}>
                  <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                    {(u.username ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${u.username}`}
                      className="text-xs font-medium hover:text-primary transition-colors">
                      @{u.username}
                    </Link>
                    {u.university && (
                      <p className="text-xs text-muted-foreground truncate">{u.university}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo(u.created_at)}</span>
                </div>
              ))}
              {(recentUsers ?? []).length === 0 && (
                <p className="px-4 py-6 text-sm text-muted-foreground text-center">No users yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
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
