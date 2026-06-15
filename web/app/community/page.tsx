import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FollowButton } from '@/components/follow-button'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Community — ConvexPi',
  description: 'Browse researchers, see their track records, and follow the ones building real alpha.',
}

type ResearcherRow = {
  id: string
  username: string
  display_name: string | null
  university: string | null
  bio: string | null
  github_username: string | null
  best_oos_sharpe: number | null
  submission_count: number
  follower_count: number
  is_following: boolean
}

export default async function CommunityPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  // Fetch profiles with aggregated submission stats
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, university, bio, github_username')
    .order('created_at', { ascending: false })
    .limit(100)

  if (!profiles || profiles.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl text-center text-muted-foreground">
        <p>No researchers found yet.</p>
      </div>
    )
  }

  // Fetch best OOS sharpe per user
  const profileIds = profiles.map(p => p.id)
  const { data: gradeData } = await supabase
    .from('submissions')
    .select('user_id, grade_reports(oos_sharpe)')
    .in('user_id', profileIds)
    .eq('status', 'completed')

  type GradeRow = { user_id: string; grade_reports: { oos_sharpe: number | null }[] | { oos_sharpe: number | null } | null }
  const gradeRows = (gradeData ?? []) as unknown as GradeRow[]

  const bestSharpeByUser: Record<string, number> = {}
  const subCountByUser: Record<string, number> = {}
  for (const row of gradeRows) {
    const report = Array.isArray(row.grade_reports) ? row.grade_reports[0] : row.grade_reports
    if (!report) continue
    subCountByUser[row.user_id] = (subCountByUser[row.user_id] ?? 0) + 1
    if (report.oos_sharpe != null) {
      const prev = bestSharpeByUser[row.user_id]
      if (prev === undefined || report.oos_sharpe > prev) {
        bestSharpeByUser[row.user_id] = report.oos_sharpe
      }
    }
  }

  // Follower counts
  const { data: followerData } = await supabase
    .from('follows')
    .select('following_id')
    .in('following_id', profileIds)

  const followerCountByUser: Record<string, number> = {}
  for (const row of followerData ?? []) {
    followerCountByUser[row.following_id] = (followerCountByUser[row.following_id] ?? 0) + 1
  }

  // Who the current user is following
  const followingSet = new Set<string>()
  if (authUser) {
    const { data: myFollows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', authUser.id)
    for (const row of myFollows ?? []) followingSet.add(row.following_id)
  }

  const researchers: ResearcherRow[] = profiles.map(p => ({
    ...p,
    best_oos_sharpe: bestSharpeByUser[p.id] ?? null,
    submission_count: subCountByUser[p.id] ?? 0,
    follower_count: followerCountByUser[p.id] ?? 0,
    is_following: followingSet.has(p.id),
  }))

  // Sort: most submissions first, then by best OOS sharpe
  researchers.sort((a, b) => {
    if (b.submission_count !== a.submission_count) return b.submission_count - a.submission_count
    return (b.best_oos_sharpe ?? -999) - (a.best_oos_sharpe ?? -999)
  })

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-10">
        <p className="text-xs font-medium tracking-widest text-primary uppercase mb-3">Community</p>
        <h1 className="text-3xl font-serif mb-3">Researchers</h1>
        <p className="text-muted-foreground">
          {profiles.length} researcher{profiles.length !== 1 ? 's' : ''} building and testing quantitative strategies.
          {!authUser && (
            <>
              {' '}
              <Link href="/login" className="underline underline-offset-4 hover:text-foreground transition-colors">
                Sign in
              </Link>{' '}
              to follow researchers.
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {researchers.map(r => (
          <ResearcherCard
            key={r.id}
            researcher={r}
            isCurrentUser={authUser?.id === r.id}
            showFollowButton={!!authUser && authUser.id !== r.id}
          />
        ))}
      </div>
    </div>
  )
}

function ResearcherCard({
  researcher: r,
  isCurrentUser,
  showFollowButton,
}: {
  researcher: ResearcherRow
  isCurrentUser: boolean
  showFollowButton: boolean
}) {
  const initial = (r.display_name ?? r.username)[0].toUpperCase()
  const sharpeColor = r.best_oos_sharpe == null ? 'text-muted-foreground'
    : r.best_oos_sharpe > 0.5 ? 'text-green-600'
    : r.best_oos_sharpe > 0   ? 'text-amber-600'
    : 'text-red-500'

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border bg-card/40 hover:border-primary/30 transition-colors">
      {/* Avatar */}
      <Link href={`/profile/${r.username}`} className="shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary hover:bg-primary/25 transition-colors">
          {initial}
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/profile/${r.username}`}
            className="font-medium text-foreground hover:text-primary transition-colors text-sm">
            {r.display_name ?? r.username}
          </Link>
          {isCurrentUser && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">you</span>
          )}
          {r.github_username && (
            <a href={`https://github.com/${r.github_username}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              @{r.github_username}
            </a>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {r.university && <span>{r.university} · </span>}
          @{r.username}
        </p>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-5 text-xs shrink-0">
        <div className="text-center">
          <p className={`font-mono font-semibold ${sharpeColor}`}>
            {r.best_oos_sharpe != null ? r.best_oos_sharpe.toFixed(2) : '—'}
          </p>
          <p className="text-muted-foreground">best OOS</p>
        </div>
        <div className="text-center">
          <p className="font-mono font-semibold text-foreground">{r.submission_count}</p>
          <p className="text-muted-foreground">submissions</p>
        </div>
        <div className="text-center">
          <p className="font-mono font-semibold text-foreground">{r.follower_count}</p>
          <p className="text-muted-foreground">followers</p>
        </div>
      </div>

      {/* Follow */}
      {showFollowButton && (
        <div className="shrink-0">
          <FollowButton
            targetId={r.id}
            initialIsFollowing={r.is_following}
            initialFollowerCount={r.follower_count}
          />
        </div>
      )}
    </div>
  )
}
