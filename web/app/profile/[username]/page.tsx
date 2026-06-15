import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CopyProfileLink } from './copy-link'
import type { GradeReport } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, university, bio, created_at')
    .eq('username', username)
    .single()

  if (!profile) notFound()

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
      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-full bg-[#3b82f6]/20 flex items-center justify-center text-xl font-serif text-[#3b82f6]">
              {(profile.display_name ?? profile.username)[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{profile.display_name ?? profile.username}</h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </div>
          {profile.university && <p className="text-sm text-muted-foreground mt-2">{profile.university}</p>}
          {profile.bio && <p className="text-sm text-foreground/80 mt-2 max-w-md">{profile.bio}</p>}
          <p className="text-xs text-muted-foreground mt-2">Member since {memberSince}</p>
        </div>
        <CopyProfileLink username={profile.username} />
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { label: 'Best OOS Sharpe', value: bestSharpe != null ? bestSharpe.toFixed(3) : '—', color: bestSharpe != null && bestSharpe > 0 ? 'text-[#14b8a6]' : 'text-red-400' },
            { label: 'Competitions',    value: String(competitionsEntered.size),                  color: 'text-foreground' },
            { label: 'Alphas found',    value: String(totalAlphasFound),                          color: 'text-[#f59e0b]' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card/40 p-4">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-2xl font-mono font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <section className="mb-10">
        <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-3">Forward track record</h2>
        <div className="rounded-xl border border-dashed border-border bg-card/20 p-6 text-center">
          <p className="text-sm font-medium text-foreground mb-1">Coming soon</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Each submitted strategy will be re-evaluated daily on fresh market seeds,
            building a live equity curve over time.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-4">Submissions</h2>
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
                      {cohort && <Link href={`${base}/${cohort.slug}`} className="text-xs text-muted-foreground hover:text-[#3b82f6] transition-colors">{cohort.name}</Link>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(s.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {report && (
                    <div className="grid grid-cols-3 gap-3">
                      <Metric label="IS Sharpe"    value={report.is_sharpe?.toFixed(3) ?? '—'}  positive={(report.is_sharpe ?? 0) > 0} />
                      <Metric label="OOS Sharpe"   value={report.oos_sharpe?.toFixed(3) ?? '—'} positive={(report.oos_sharpe ?? 0) > 0} highlight />
                      <Metric label="Overfit ratio" value={report.overfitting_ratio != null ? `${(report.overfitting_ratio * 100).toFixed(0)}%` : '—'} positive={(report.overfitting_ratio ?? 0) >= 0.7} />
                    </div>
                  )}
                  {report?.alphas_discovered != null && (
                    <p className="text-xs text-muted-foreground mt-2">Alphas: {report.alphas_discovered}/{report.total_alphas} discovered</p>
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

function Metric({ label, value, positive, highlight }: { label: string; value: string; positive: boolean; highlight?: boolean }) {
  const color = highlight ? (positive ? 'text-[#14b8a6]' : 'text-red-400') : (positive ? 'text-foreground' : 'text-muted-foreground')
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-mono font-semibold text-sm ${color}`}>{value}</p>
    </div>
  )
}
