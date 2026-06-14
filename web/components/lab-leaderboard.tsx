import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
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
  profiles: EmbeddedProfile | EmbeddedProfile[] | null
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
  strategyName: string
  oosSharpe: number | null
  overfitRatio: number | null
  maxDd: number | null
  turnover: number | null
  alphasFound: string | null
  submittedAt: string
  forwardSharpe: number | null
}

const BASELINES: (Omit<LeaderboardEntry, 'submissionId' | 'forwardSharpe'>)[] = [
  { userId: '__eq', username: '— Baseline —', strategyName: 'Equal Weight', oosSharpe: 0.10, overfitRatio: 1.00, maxDd: -12.4, turnover: 0.7, alphasFound: null, submittedAt: '' },
  { userId: '__mom', username: '— Baseline —', strategyName: 'Naive Momentum', oosSharpe: -0.05, overfitRatio: -0.17, maxDd: -28.1, turnover: 11.2, alphasFound: null, submittedAt: '' },
  { userId: '__noise', username: '— Baseline —', strategyName: 'Random Noise', oosSharpe: -0.80, overfitRatio: -0.84, maxDd: -61.3, turnover: 45.0, alphasFound: null, submittedAt: '' },
]

function oneProfile(v: EmbeddedProfile | EmbeddedProfile[] | null): EmbeddedProfile | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

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
  const supabase = await createClient()

  const { data } = await supabase
    .from('submissions')
    .select('id, user_id, strategy_name, submitted_at, profiles(username, display_name), grade_reports(oos_sharpe, is_sharpe, overfitting_ratio, oos_max_dd, oos_turnover, alphas_discovered, total_alphas)')
    .eq('cohort_id', cohortId)
    .eq('status', 'completed')
    .order('submitted_at', { ascending: false })

  // Best OOS Sharpe per user — track submission ID for forward score lookup
  const byUser = new Map<string, LeaderboardEntry>()
  for (const row of (data ?? []) as SubmissionRow[]) {
    const report = oneReport(row.grade_reports)
    if (!report) continue
    const existing = byUser.get(row.user_id)
    const sharpe = report.oos_sharpe
    if (existing != null && (sharpe == null || (existing.oosSharpe != null && sharpe <= existing.oosSharpe))) continue
    const profile = oneProfile(row.profiles)
    byUser.set(row.user_id, {
      submissionId: row.id,
      userId: row.user_id,
      username: profile?.display_name ?? profile?.username ?? row.user_id.slice(0, 8),
      strategyName: row.strategy_name,
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
                <td className="px-4 py-3 font-medium">{e.username}</td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{e.strategyName}</td>
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
