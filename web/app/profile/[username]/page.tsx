import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
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

  // Submissions to public competitions (readable by anyone per RLS)
  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, strategy_name, submitted_at, status, cohort_id, grade_reports(*), cohorts!inner(name, slug, type, visibility)')
    .eq('user_id', profile.id)
    .eq('status', 'completed')
    .order('submitted_at', { ascending: false })
    .limit(20)

  type SubmissionWithJoins = {
    id: string
    cohort_id: string
    strategy_name: string
    submitted_at: string
    status: string
    grade_reports: GradeReport[] | GradeReport | null
    cohorts: { name: string; slug: string; type: string; visibility: string } | null
  }

  const rows = (submissions ?? []) as unknown as SubmissionWithJoins[]

  // Best OOS Sharpe across all submissions
  let bestSharpe: number | null = null
  let totalAlphasFound = 0
  const competitionsEntered = new Set<string>()

  for (const row of rows) {
    const report = Array.isArray(row.grade_reports) ? row.grade_reports[0] : row.grade_reports
    if (!report) continue
    competitionsEntered.add(row.cohort_id ?? '')
    if (report.oos_sharpe != null && (bestSharpe == null || report.oos_sharpe > bestSharpe)) {
      bestSharpe = report.oos_sharpe
    }
    if (report.alphas_discovered) totalAlphasFound += report.alphas_discovered
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', { dateStyle: 'long' })

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">
          {profile.display_name ?? profile.username}
        </h1>
        <p className="text-muted-foreground text-sm">@{profile.username}</p>
        {profile.university && (
          <p className="text-sm text-muted-foreground mt-1">{profile.university}</p>
        )}
        {profile.bio && (
          <p className="text-sm mt-2">{profile.bio}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">Member since {memberSince}</p>
      </div>

      {/* Stats */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-10">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Best OOS Sharpe</p>
              <p className={`text-2xl font-mono font-bold ${bestSharpe != null && bestSharpe > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {bestSharpe != null ? bestSharpe.toFixed(3) : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Competitions</p>
              <p className="text-2xl font-mono font-bold">{competitionsEntered.size}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Alphas discovered</p>
              <p className="text-2xl font-mono font-bold">{totalAlphasFound}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Submission history */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Submissions</h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No public submissions yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map(s => {
              const report = Array.isArray(s.grade_reports) ? s.grade_reports[0] : s.grade_reports
              const cohort = s.cohorts
              return (
                <Card key={s.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{s.strategy_name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {cohort && (
                          <Link
                            href={`/${cohort.type === 'competition' ? 'compete' : 'classroom'}/${cohort.slug}`}
                            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                          >
                            {cohort.name}
                          </Link>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(s.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  {report && (
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <Metric
                          label="IS Sharpe"
                          value={report.is_sharpe?.toFixed(3) ?? '—'}
                          positive={(report.is_sharpe ?? 0) > 0}
                        />
                        <Metric
                          label="OOS Sharpe"
                          value={report.oos_sharpe?.toFixed(3) ?? '—'}
                          positive={(report.oos_sharpe ?? 0) > 0}
                        />
                        <Metric
                          label="Overfit ratio"
                          value={report.overfitting_ratio != null
                            ? `${(report.overfitting_ratio * 100).toFixed(0)}%`
                            : '—'}
                          positive={(report.overfitting_ratio ?? 0) >= 0.7}
                        />
                      </div>
                      {report.alphas_discovered != null && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Alphas discovered: {report.alphas_discovered}/{report.total_alphas}
                        </p>
                      )}
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-mono font-semibold ${positive ? 'text-green-600' : 'text-red-600'}`}>{value}</p>
    </div>
  )
}
