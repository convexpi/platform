import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Avatar } from '@/components/avatar'

type ActivityRow = {
  id: string
  strategy_name: string
  submitted_at: string
  oos_sharpe: number | null
  cohort_name: string | null
  cohort_slug: string | null
  cohort_type: string | null
  username: string | null
  display_name: string | null
  github_username: string | null
}

export async function ActivityFeed({ followingIds }: { followingIds?: string[] }) {
  // Public activity feed — read via the service client (RLS would otherwise hide submissions from
  // non-members); private cohorts are filtered out below.
  const supabase = createAdminClient()

  let query = supabase
    .from('submissions')
    .select(`
      id,
      user_id,
      strategy_name,
      submitted_at,
      grade_reports(oos_sharpe),
      cohorts!inner(name, slug, type, visibility)
    `)
    .eq('status', 'completed')
    .order('submitted_at', { ascending: false })
    .limit(20)

  if (followingIds && followingIds.length > 0) {
    query = query.in('user_id', followingIds)
  }

  const { data: submissions } = await query

  type Row = {
    id: string; user_id: string; strategy_name: string; submitted_at: string
    grade_reports: { oos_sharpe: number | null }[] | { oos_sharpe: number | null } | null
    cohorts: { name: string; slug: string; type: string; visibility: string } | null
  }

  const rows = (submissions ?? []) as unknown as Row[]

  // profiles can't be embedded on submissions (no FK to profiles); resolve names separately.
  const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
  const { data: profileRows } = userIds.length
    ? await supabase.from('profiles').select('id, username, display_name, github_username').in('id', userIds)
    : { data: [] as { id: string; username: string; display_name: string | null; github_username: string | null }[] }
  const profileById = new Map((profileRows ?? []).map(p => [p.id, p]))

  const activity: ActivityRow[] = rows
    .filter(r => r.cohorts?.visibility !== 'private')
    .map(r => {
      const gr = Array.isArray(r.grade_reports) ? r.grade_reports[0] : r.grade_reports
      const p = profileById.get(r.user_id)
      return {
        id: r.id,
        strategy_name: r.strategy_name,
        submitted_at: r.submitted_at,
        oos_sharpe: gr?.oos_sharpe ?? null,
        cohort_name: r.cohorts?.name ?? null,
        cohort_slug: r.cohorts?.slug ?? null,
        cohort_type: r.cohorts?.type ?? null,
        username: p?.username ?? null,
        display_name: p?.display_name ?? null,
        github_username: p?.github_username ?? null,
      }
    })

  if (activity.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        {followingIds && followingIds.length > 0
          ? 'No recent activity from researchers you follow.'
          : 'No recent public submissions.'}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {activity.map(a => {
        const base = a.cohort_type === 'competition' ? '/compete' : '/classroom'
        const sharpeColor = a.oos_sharpe == null ? 'text-muted-foreground'
          : a.oos_sharpe > 0 ? 'text-[#14b8a6]' : 'text-red-400'
        const timeAgo = formatTimeAgo(a.submitted_at)

        return (
          <div key={a.id} className="flex items-center gap-3 py-2.5 border-b last:border-b-0">
            {a.username && (
              <Link href={`/profile/${a.username}`} className="shrink-0">
                <Avatar
                  username={a.username}
                  displayName={a.display_name}
                  githubUsername={a.github_username}
                  size={28}
                  className="hover:opacity-80 transition-opacity"
                />
              </Link>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground leading-relaxed">
                {a.username && (
                  <Link href={`/profile/${a.username}`}
                    className="font-medium hover:text-primary transition-colors">
                    {a.display_name ?? a.username}
                  </Link>
                )}{' '}
                submitted{' '}
                <span className="font-medium">{a.strategy_name}</span>
                {a.cohort_slug && (
                  <>
                    {' '}to{' '}
                    <Link href={`${base}/${a.cohort_slug}`}
                      className="hover:text-primary transition-colors underline underline-offset-4">
                      {a.cohort_name}
                    </Link>
                  </>
                )}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {a.oos_sharpe != null && (
                <p className={`text-xs font-mono font-semibold ${sharpeColor}`}>
                  {a.oos_sharpe > 0 ? '+' : ''}{a.oos_sharpe.toFixed(2)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 2)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
