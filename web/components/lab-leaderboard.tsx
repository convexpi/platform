import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'

interface LabLeaderboardProps {
  cohortId: string
  cohortSlug: string
  cohortType?: 'competition' | 'classroom'
}

interface EmbeddedProfile {
  username: string
  display_name: string | null
}

interface EmbeddedGradeReport {
  oos_sharpe: number | null
  is_sharpe: number | null
  overfitting_ratio: number | null
  oos_max_dd: number | null
  oos_turnover: number | null
  alphas_discovered: number | null
  total_alphas: number | null
}

interface SubmissionRow {
  id: string
  user_id: string
  strategy_name: string
  submitted_at: string
  github_url: string | null
  language: string | null
  grade_reports: EmbeddedGradeReport | EmbeddedGradeReport[] | null
}

interface ForwardScoreRow {
  submission_id: string
  forward_sharpe: number | null
  run_date: string
}

interface LeaderboardEntry {
  submissionId: string
  userId: string
  username: string
  usernameSlug: string | null
  strategyName: string
  githubUrl: string | null
  oosSharpe: number | null
  overfitRatio: number | null
  maxDd: number | null
  turnover: number | null
  alphasFound: string | null
  submittedAt: string
  forwardSharpe: number | null
  language: string | null
}

const BASELINES: (Omit<LeaderboardEntry, 'submissionId' | 'forwardSharpe' | 'language'>)[] = [
  { userId: '__eq',    username: '— Baseline —', usernameSlug: null, githubUrl: null, strategyName: 'Equal Weight',    oosSharpe:  0.10, overfitRatio:  1.00, maxDd: -12.4, turnover:  0.7, alphasFound: null, submittedAt: '' },
  { userId: '__mom',   username: '— Baseline —', usernameSlug: null, githubUrl: null, strategyName: 'Naive Momentum',  oosSharpe: -0.05, overfitRatio: -0.17, maxDd: -28.1, turnover: 11.2, alphasFound: null, submittedAt: '' },
  { userId: '__noise', username: '— Baseline —', usernameSlug: null, githubUrl: null, strategyName: 'Random Noise',    oosSharpe: -0.80, overfitRatio: -0.84, maxDd: -61.3, turnover: 45.0, alphasFound: null, submittedAt: '' },
]

function oneReport(v: EmbeddedGradeReport | EmbeddedGradeReport[] | null): EmbeddedGradeReport | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

function oosColor(v: number | null) {
  if (v == null) return 'text-muted-foreground'
  return v > 0 ? 'text-green-600' : 'text-red-600'
}

function OverfitBadge({ v }: { v: number | null }) {
  if (v == null) return <span className="text-muted-foreground">—</span>
  const pct = `${(v * 100).toFixed(0)}%`
  if (v >= 0.7) return <Badge variant="outline" className="text-xs text-green-600 border-green-200">{pct}</Badge>
  if (v >= 0.3) return <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-200">{pct}</Badge>
  return <Badge variant="outline" className="text-xs text-red-600 border-red-200">{pct}</Badge>
}

export async function LabLeaderboard({ cohortId, cohortSlug, cohortType = 'competition' }: LabLeaderboardProps) {
  // Leaderboards are public rankings. Read via the service client so they render the full field —
  // RLS on submissions restricts reads to the owner / cohort members, which would otherwise leave
  // an open competition's board empty for everyone. (Pages embedding a private classroom's board
  // gate membership themselves.)
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('submissions')
    .select('id, user_id, strategy_name, submitted_at, github_url, language, grade_reports(oos_sharpe, is_sharpe, overfitting_ratio, oos_max_dd, oos_turnover, alphas_discovered, total_alphas)')
    .eq('cohort_id', cohortId)
    .eq('status', 'completed')
    .order('submitted_at', { ascending: false })

  const subRows = (data ?? []) as SubmissionRow[]

  // profiles can't be embedded on submissions (submissions.user_id → auth.users, not profiles —
  // no FK PostgREST can follow), so resolve display names in a separate query.
  const userIds = [...new Set(subRows.map(r => r.user_id).filter(Boolean))]
  const { data: profileRows } = userIds.length
    ? await supabase.from('profiles').select('id, username, display_name').in('id', userIds)
    : { data: [] as { id: string; username: string; display_name: string | null }[] }
  const profileById = new Map((profileRows ?? []).map(p => [p.id, p as EmbeddedProfile & { id: string }]))

  // Best OOS Sharpe per user — track submission ID for forward score lookup
  const byUser = new Map<string, LeaderboardEntry>()
  for (const row of subRows) {
    const report = oneReport(row.grade_reports)
    if (!report) continue
    const existing = byUser.get(row.user_id)
    const sharpe = report.oos_sharpe
    if (existing != null && (sharpe == null || (existing.oosSharpe != null && sharpe <= existing.oosSharpe))) continue
    const profile = profileById.get(row.user_id) ?? null
    byUser.set(row.user_id, {
      submissionId: row.id,
      userId: row.user_id,
      username: profile?.display_name ?? profile?.username ?? row.user_id.slice(0, 8),
      usernameSlug: profile?.username ?? null,
      strategyName: row.strategy_name,
      githubUrl: row.github_url ?? null,
      oosSharpe: sharpe,
      overfitRatio: report.overfitting_ratio,
      maxDd: report.oos_max_dd,
      turnover: report.oos_turnover,
      alphasFound:
        report.alphas_discovered != null && report.total_alphas != null
          ? `${report.alphas_discovered}/${report.total_alphas}`
          : null,
      submittedAt: row.submitted_at,
      forwardSharpe: null,
      language: row.language ?? 'python',
    })
  }

  const ranked = Array.from(byUser.values()).sort((a, b) => {
    if (a.oosSharpe == null && b.oosSharpe == null) return 0
    if (a.oosSharpe == null) return 1
    if (b.oosSharpe == null) return -1
    return b.oosSharpe - a.oosSharpe
  })

  // Fetch latest forward score for each best submission (single batch query)
  if (ranked.length > 0) {
    const subIds = ranked.map(e => e.submissionId)
    const { data: fwdData } = await supabase
      .from('forward_scores')
      .select('submission_id, forward_sharpe, run_date')
      .in('submission_id', subIds)
      .order('run_date', { ascending: false })

    // Keep only the most recent score per submission_id
    const latestFwd = new Map<string, number | null>()
    for (const row of (fwdData ?? []) as ForwardScoreRow[]) {
      if (!latestFwd.has(row.submission_id)) {
        latestFwd.set(row.submission_id, row.forward_sharpe)
      }
    }
    for (const entry of ranked) {
      entry.forwardSharpe = latestFwd.get(entry.submissionId) ?? null
    }
  }

  const submitHref = `/${cohortType === 'classroom' ? 'classroom' : 'compete'}/${cohortSlug}/submit`

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground w-10">#</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">User</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Strategy</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">OOS Sharpe</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground hidden md:table-cell">Forward</th>
              <th className="px-4 py-2 text-center font-medium text-muted-foreground hidden md:table-cell">Overfit</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground hidden lg:table-cell">Max DD</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground hidden lg:table-cell">Turnover</th>
              <th className="px-4 py-2 text-center font-medium text-muted-foreground hidden xl:table-cell">Alphas</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ranked.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                  No submissions yet.{' '}
                  <Link href={submitHref} className="underline underline-offset-4 hover:text-foreground">
                    Submit your strategy
                  </Link>{' '}
                  to appear on the leaderboard.
                </td>
              </tr>
            )}
            {ranked.map((e, i) => (
              <tr key={e.userId} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-3 font-medium">
                  {e.usernameSlug ? (
                    <Link href={`/profile/${e.usernameSlug}`}
                      className="hover:text-primary transition-colors">{e.username}</Link>
                  ) : e.username}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                  <span className="flex items-center gap-2">
                    {e.strategyName}
                    {e.language && e.language !== 'python' && (
                      <Badge variant="outline" className="text-[10px] uppercase">{e.language}</Badge>
                    )}
                    {e.githubUrl && (
                      <a href={e.githubUrl} target="_blank" rel="noopener noreferrer"
                        title="View code on GitHub"
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                        </svg>
                      </a>
                    )}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right font-mono tabular-nums font-semibold ${oosColor(e.oosSharpe)}`}>
                  {e.oosSharpe != null ? e.oosSharpe.toFixed(3) : '—'}
                </td>
                <td className={`px-4 py-3 text-right font-mono tabular-nums hidden md:table-cell ${oosColor(e.forwardSharpe)}`}>
                  {e.forwardSharpe != null ? e.forwardSharpe.toFixed(3) : '—'}
                </td>
                <td className="px-4 py-3 text-center hidden md:table-cell">
                  <OverfitBadge v={e.overfitRatio} />
                </td>
                <td className="px-4 py-3 text-right font-mono hidden lg:table-cell text-muted-foreground">
                  {e.maxDd != null ? `${e.maxDd.toFixed(1)}%` : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono hidden lg:table-cell text-muted-foreground">
                  {e.turnover != null ? e.turnover.toFixed(1) : '—'}
                </td>
                <td className="px-4 py-3 text-center hidden xl:table-cell text-muted-foreground">
                  {e.alphasFound ?? '—'}
                </td>
              </tr>
            ))}

            {/* Reference baselines — always visible */}
            <tr>
              <td colSpan={9} className="px-4 py-1 bg-muted/30 text-xs text-muted-foreground font-medium">
                Reference baselines (not ranked)
              </td>
            </tr>
            {BASELINES.map(b => (
              <tr key={b.userId} className="opacity-55">
                <td className="px-4 py-2.5 font-mono text-muted-foreground text-xs">—</td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">{b.username}</td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">{b.strategyName}</td>
                <td className={`px-4 py-2.5 text-right font-mono tabular-nums text-xs ${oosColor(b.oosSharpe)}`}>
                  {b.oosSharpe != null ? b.oosSharpe.toFixed(2) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right font-mono hidden md:table-cell text-muted-foreground text-xs">—</td>
                <td className="px-4 py-2.5 text-center hidden md:table-cell">
                  <OverfitBadge v={b.overfitRatio} />
                </td>
                <td className="px-4 py-2.5 text-right font-mono hidden lg:table-cell text-muted-foreground text-xs">
                  {b.maxDd != null ? `${b.maxDd.toFixed(1)}%` : '—'}
                </td>
                <td className="px-4 py-2.5 text-right font-mono hidden lg:table-cell text-muted-foreground text-xs">
                  {b.turnover != null ? b.turnover.toFixed(1) : '—'}
                </td>
                <td className="px-4 py-2.5 text-center hidden xl:table-cell text-muted-foreground text-xs">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        OOS Sharpe is measured on a hidden holdout. Overfit = OOS ÷ IS Sharpe (target ≥ 70%). Forward Sharpe updates nightly on live synthetic data.
      </p>
    </div>
  )
}
