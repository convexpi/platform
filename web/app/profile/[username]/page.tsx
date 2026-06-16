import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CopyProfileLink } from './copy-link'
import { FollowButton } from '@/components/follow-button'
import { Avatar } from '@/components/avatar'
import type { GradeReport } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, university, bio, created_at, github_username, website_url')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const isOwner = authUser?.id === profile.id

  // Social counts (gracefully handles missing follows table)
  const [followerRes, followingRes, isFollowingRes] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
    authUser && !isOwner
      ? supabase.from('follows').select('*', { count: 'exact', head: true })
          .eq('follower_id', authUser.id).eq('following_id', profile.id)
      : Promise.resolve({ count: 0, error: null }),
  ])
  const followerCount  = followerRes.count  ?? 0
  const followingCount = followingRes.count ?? 0
  const isFollowing    = (isFollowingRes.count ?? 0) > 0

  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, strategy_name, submitted_at, status, cohort_id, grade_reports(*), cohorts!inner(name, slug, type, visibility)')
    .eq('user_id', profile.id)
    .eq('status', 'completed')
    .order('submitted_at', { ascending: false })
    .limit(20)

  type SubmissionRow = {
    id: string; cohort_id: string; strategy_name: string; submitted_at: string
    status: string; grade_reports: GradeReport[] | GradeReport | null
    cohorts: { name: string; slug: string; type: string; visibility: string } | null
  }

  const rows = (submissions ?? []) as unknown as SubmissionRow[]

  let bestSharpe: number | null = null
  let totalAlphasFound = 0
  const competitionsEntered = new Set<string>()
  for (const row of rows) {
    const r = Array.isArray(row.grade_reports) ? row.grade_reports[0] : row.grade_reports
    if (!r) continue
    competitionsEntered.add(row.cohort_id ?? '')
    if (r.oos_sharpe != null && (bestSharpe == null || r.oos_sharpe > bestSharpe)) bestSharpe = r.oos_sharpe
    if (r.alphas_discovered) totalAlphasFound += r.alphas_discovered
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">

      {/* Profile header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Avatar
              username={profile.username}
              displayName={profile.display_name}
              githubUsername={profile.github_username}
              size={56}
              className="shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground truncate">
                {profile.display_name ?? profile.username}
              </h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </div>

          {profile.university && (
            <p className="text-sm text-muted-foreground mt-2">{profile.university}</p>
          )}
          {profile.bio && (
            <p className="text-sm text-foreground/80 mt-2 leading-relaxed max-w-lg">{profile.bio}</p>
          )}

          {/* External links */}
          <div className="flex flex-wrap gap-3 mt-3">
            {profile.github_username && (
              <a href={`https://github.com/${profile.github_username}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <GithubIcon />
                {profile.github_username}
              </a>
            )}
            {profile.website_url && (
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <LinkIcon />
                {profile.website_url.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>

          {/* Social counts */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <Link href={`/profile/${profile.username}/followers`}
              className="hover:text-foreground transition-colors">
              <span className="font-medium text-foreground">{followerCount}</span>{' '}
              {followerCount === 1 ? 'follower' : 'followers'}
            </Link>
            <Link href={`/profile/${profile.username}/following`}
              className="hover:text-foreground transition-colors">
              <span className="font-medium text-foreground">{followingCount}</span>{' '}
              following
            </Link>
            <span className="text-muted-foreground/60">·</span>
            <span>Member since {memberSince}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <CopyProfileLink username={profile.username} />
          {isOwner ? (
            <Link href="/profile/edit"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors">
              Edit profile
            </Link>
          ) : authUser ? (
            <FollowButton
              targetId={profile.id}
              initialIsFollowing={isFollowing}
              initialFollowerCount={followerCount}
            />
          ) : null}
        </div>
      </div>

      {/* Stats */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            {
              label: 'Best OOS Sharpe',
              value: bestSharpe != null ? bestSharpe.toFixed(3) : '—',
              color: bestSharpe != null && bestSharpe > 0 ? 'text-[#14b8a6]' : 'text-red-400',
            },
            { label: 'Competitions', value: String(competitionsEntered.size), color: 'text-foreground' },
            { label: 'Alphas found', value: String(totalAlphasFound),          color: 'text-[#f59e0b]' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card/40 p-4">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-2xl font-mono font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Forward track record */}
      <section className="mb-10">
        <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-3">
          Forward track record
        </h2>
        <div className="rounded-xl border border-dashed border-border bg-card/20 p-6 text-center">
          <p className="text-sm font-medium text-foreground mb-1">Coming soon</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Each submitted strategy will be re-evaluated daily on fresh market seeds,
            building a live equity curve over time.
          </p>
        </div>
      </section>

      {/* Submissions */}
      <section>
        <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-4">
          Submissions
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public submissions yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map(s => {
              const report = Array.isArray(s.grade_reports) ? s.grade_reports[0] : s.grade_reports
              const cohort = s.cohorts
              const base = cohort?.type === 'competition' ? '/compete' : '/classroom'
              return (
                <div key={s.id} className="rounded-xl border border-border bg-card/40 p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{s.strategy_name}</p>
                      {cohort && (
                        <Link href={`${base}/${cohort.slug}`}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors">
                          {cohort.name}
                        </Link>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(s.submitted_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                  </div>
                  {report && (
                    <div className="grid grid-cols-3 gap-3">
                      <Metric label="IS Sharpe"     value={report.is_sharpe?.toFixed(3) ?? '—'}   positive={(report.is_sharpe ?? 0) > 0} />
                      <Metric label="OOS Sharpe"    value={report.oos_sharpe?.toFixed(3) ?? '—'}  positive={(report.oos_sharpe ?? 0) > 0} highlight />
                      <Metric label="Overfit ratio" value={report.overfitting_ratio != null ? `${(report.overfitting_ratio * 100).toFixed(0)}%` : '—'} positive={(report.overfitting_ratio ?? 0) >= 0.7} />
                    </div>
                  )}
                  {report?.alphas_discovered != null && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Alphas: {report.alphas_discovered}/{report.total_alphas} discovered
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value, positive, highlight }: {
  label: string; value: string; positive: boolean; highlight?: boolean
}) {
  const color = highlight
    ? (positive ? 'text-[#14b8a6]' : 'text-red-400')
    : (positive ? 'text-foreground' : 'text-muted-foreground')
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-mono font-semibold text-sm ${color}`}>{value}</p>
    </div>
  )
}

function GithubIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  )
}
