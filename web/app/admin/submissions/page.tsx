import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'
import { retrySubmission } from './actions'

export const metadata: Metadata = { title: 'Submissions — Admin' }

const STATUS_OPTS = ['all', 'pending', 'running', 'completed', 'failed'] as const

export default async function AdminSubmissions({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status, q } = await searchParams
  const db = createAdminClient()

  // submissions.user_id → auth.users (not profiles), so we can't use an
  // embedded join to get usernames. Fetch submissions + cohorts + grade_reports
  // together (all have direct FKs), then look up profile usernames separately.
  let subQuery = db
    .from('submissions')
    .select(`
      id, strategy_name, status, submitted_at, error_message, user_id,
      cohorts(name, slug, type),
      grade_reports(oos_sharpe, is_sharpe, overfitting_ratio, graded_at)
    `)
    .order('submitted_at', { ascending: false })
    .limit(200)

  if (status && status !== 'all') {
    subQuery = subQuery.eq('status', status)
  }

  const { data, error: subErr } = await subQuery

  if (subErr) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-2">Submissions</h1>
        <p className="text-sm text-red-600 font-mono bg-red-50 p-4 rounded-lg">
          Error: {subErr.message}
        </p>
      </div>
    )
  }

  type SubRow = {
    id: string; strategy_name: string; status: string; submitted_at: string
    error_message: string | null; user_id: string
    cohorts: { name: string; slug: string; type: string } | null
    grade_reports: { oos_sharpe: number | null; is_sharpe: number | null; overfitting_ratio: number | null; graded_at: string }[] | null
    username?: string
  }

  let rows = (data ?? []) as unknown as SubRow[]

  // Look up usernames for all unique user_ids (profiles.id === auth.users.id)
  const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
  if (userIds.length) {
    const { data: profiles } = await db
      .from('profiles').select('id, username').in('id', userIds)
    const usernameById: Record<string, string> = {}
    for (const p of profiles ?? []) usernameById[p.id] = p.username
    rows = rows.map(r => ({ ...r, username: usernameById[r.user_id] }))
  }

  const sq = q?.toLowerCase().trim()
  if (sq) {
    rows = rows.filter(r =>
      r.strategy_name.toLowerCase().includes(sq) ||
      r.username?.toLowerCase().includes(sq) ||
      r.cohorts?.name?.toLowerCase().includes(sq)
    )
  }

  const counts = {
    all: rows.length,
    pending: rows.filter(r => r.status === 'pending').length,
    running: rows.filter(r => r.status === 'running').length,
    completed: rows.filter(r => r.status === 'completed').length,
    failed: rows.filter(r => r.status === 'failed').length,
  }

  const statusStyle: Record<string, string> = {
    completed: 'text-emerald-600 bg-emerald-50',
    failed:    'text-red-600 bg-red-50',
    running:   'text-blue-600 bg-blue-50',
    pending:   'text-amber-600 bg-amber-50',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Submissions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{rows.length} shown</p>
        </div>
        <form method="GET" className="relative flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search…"
            className="pl-3 pr-3 py-1.5 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring w-48"
          />
        </form>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-6 border-b pb-3">
        {STATUS_OPTS.map(s => {
          const active = (status ?? 'all') === s
          const href = s === 'all' ? '/admin/submissions' : `/admin/submissions?status=${s}`
          const count = counts[s as keyof typeof counts]
          return (
            <Link key={s} href={href}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {count > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
            </Link>
          )
        })}
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Strategy</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">User</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Cohort</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">IS</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">OOS</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(s => {
              const report = s.grade_reports?.[0]
              const base = s.cohorts?.type === 'competition' ? '/compete' : '/classroom'
              return (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-4 py-3">
                    <span className="font-medium group-hover:text-primary transition-colors">
                      {s.strategy_name}
                    </span>
                    {s.error_message && (
                      <p className="text-xs text-red-500 mt-0.5 truncate max-w-[200px]" title={s.error_message}>
                        ✗ {s.error_message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.username ? (
                      <Link href={`/profile/${s.username}`}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        @{s.username}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {s.cohorts ? (
                      <Link href={`${base}/${s.cohorts.slug}`}
                        className="hover:text-foreground transition-colors truncate max-w-[120px] block">
                        {s.cohorts.name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                    {report?.is_sharpe != null ? report.is_sharpe.toFixed(2) : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${
                    report?.oos_sharpe == null ? 'text-muted-foreground'
                    : report.oos_sharpe > 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {report?.oos_sharpe != null ? report.oos_sharpe.toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle[s.status] ?? ''}`}>
                      {s.status}
                    </span>
                    {(s.status === 'failed' || s.status === 'running') && (
                      <form action={retrySubmission} className="inline">
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit"
                          className="ml-2 text-[11px] text-amber-700 hover:text-amber-900 underline underline-offset-2">
                          retry
                        </button>
                      </form>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground tabular-nums">
                    {timeAgo(s.submitted_at)}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No submissions found.</td></tr>
            )}
          </tbody>
        </table>
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
