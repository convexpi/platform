import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { Cohort, Submission, GradeReport, Profile } from '@/lib/types'
import { SeasonManager } from '@/components/season-manager'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ArenaSession = {
  id: string
  season_name: string
  description: string | null
  status: string
  started_at: string
  ended_at: string | null
}

type ForwardScore = { run_date: string; forward_sharpe: number | null }

type SubmissionRow = Submission & {
  grade_reports: GradeReport | GradeReport[] | null
  forward_scores: ForwardScore[]
}

function toArray<T>(v: T | T[] | null | undefined): T[] {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

type StudentSummary = {
  userId: string
  username: string
  displayName: string
  submissions: number
  bestOosSharpe: number | null
  latestForwardSharpe: number | null
  alphasDiscovered: number | null
  lastSubmittedAt: string | null
  latestStatus: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number | null | undefined, decimals = 2) {
  if (n == null) return '—'
  return n.toFixed(decimals)
}

function statusBadge(status: string) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    completed: 'default',
    running:   'secondary',
    pending:   'outline',
    failed:    'destructive',
  }
  return <Badge variant={variants[status] ?? 'outline'} className="text-xs">{status}</Badge>
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function InstructorDashboard({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load cohort and verify caller is owner/admin
  const { data: cohort } = await supabase
    .from('cohorts')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!cohort) notFound()

  const { data: myMembership } = await supabase
    .from('cohort_members')
    .select('role')
    .eq('cohort_id', (cohort as Cohort).id)
    .eq('user_id', user.id)
    .single()

  if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
    redirect('/dashboard')
  }

  // Load all members (no embedded join — cohort_members.user_id → auth.users, not profiles)
  const { data: members } = await supabase
    .from('cohort_members')
    .select('user_id, role, joined_at')
    .eq('cohort_id', (cohort as Cohort).id)

  // Load all submissions with grade reports and latest forward score
  const { data: rawSubmissions } = await supabase
    .from('submissions')
    .select('*, grade_reports(*), forward_scores(run_date, forward_sharpe)')
    .eq('cohort_id', (cohort as Cohort).id)
    .order('submitted_at', { ascending: false })

  const submissions = (rawSubmissions ?? []) as SubmissionRow[]

  // Fetch profiles for all relevant user_ids in one query
  const memberIds    = (members ?? []).map(m => m.user_id)
  const submitterIds = submissions.map(s => s.user_id)
  const allIds       = [...new Set([...memberIds, ...submitterIds])]

  const { data: profileRows } = allIds.length > 0
    ? await supabase.from('profiles').select('*').in('id', allIds)
    : { data: [] }

  const profileMap = new Map<string, Profile>(
    (profileRows ?? []).map(p => [p.id, p as Profile])
  )

  // Build per-student summary
  const studentMap = new Map<string, StudentSummary>()
  for (const m of members ?? []) {
    const p = profileMap.get(m.user_id) ?? null
    if (!p) continue
    studentMap.set(m.user_id, {
      userId: m.user_id,
      username: p.username,
      displayName: p.display_name ?? p.username,
      submissions: 0,
      bestOosSharpe: null,
      latestForwardSharpe: null,
      alphasDiscovered: null,
      lastSubmittedAt: null,
      latestStatus: null,
    })
  }
  for (const s of submissions) {
    const uid = s.user_id
    if (!studentMap.has(uid)) continue
    const entry = studentMap.get(uid)!
    entry.submissions++
    if (!entry.lastSubmittedAt || s.submitted_at > entry.lastSubmittedAt) {
      entry.lastSubmittedAt = s.submitted_at
      entry.latestStatus = s.status
    }
    for (const gr of toArray(s.grade_reports)) {
      if (gr.oos_sharpe != null && (entry.bestOosSharpe == null || gr.oos_sharpe > entry.bestOosSharpe)) {
        entry.bestOosSharpe = gr.oos_sharpe
      }
      if (gr.alphas_discovered != null && (entry.alphasDiscovered == null || gr.alphas_discovered > entry.alphasDiscovered)) {
        entry.alphasDiscovered = gr.alphas_discovered
      }
    }
    // Latest forward score (most recent run_date)
    const fwdScores = (s.forward_scores ?? []).sort((a: ForwardScore, b: ForwardScore) =>
      b.run_date.localeCompare(a.run_date)
    )
    if (fwdScores.length > 0 && fwdScores[0].forward_sharpe != null) {
      entry.latestForwardSharpe = fwdScores[0].forward_sharpe
    }
  }

  const students = [...studentMap.values()].sort((a, b) =>
    (b.bestOosSharpe ?? -Infinity) - (a.bestOosSharpe ?? -Infinity)
  )

  // Load arena seasons for this cohort
  const { data: rawSessions } = await supabase
    .from('arena_sessions')
    .select('id, season_name, description, status, started_at, ended_at')
    .eq('cohort_id', (cohort as Cohort).id)
    .order('started_at', { ascending: false })

  const seasons = (rawSessions ?? []) as ArenaSession[]

  const pending   = submissions.filter(s => s.status === 'pending').length
  const running   = submissions.filter(s => s.status === 'running').length
  const completed = submissions.filter(s => s.status === 'completed').length
  const failed    = submissions.filter(s => s.status === 'failed').length
  const notSubmitted = students.filter(s => s.submissions === 0).length

  // Cohort-level aggregate statistics (students who have at least one graded submission)
  const gradedStudents = students.filter(s => s.bestOosSharpe != null)
  const oosSharpes = gradedStudents.map(s => s.bestOosSharpe!)
  const meanOos = oosSharpes.length > 0
    ? oosSharpes.reduce((a, b) => a + b, 0) / oosSharpes.length
    : null
  const sorted = [...oosSharpes].sort((a, b) => a - b)
  const medianOos = sorted.length > 0
    ? sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
    : null
  const pctPositive = oosSharpes.length > 0
    ? Math.round((oosSharpes.filter(x => x > 0).length / oosSharpes.length) * 100)
    : null

  // Average overfitting ratio across all completed grade_reports in this cohort
  const allGradeReports = submissions.flatMap(s => toArray(s.grade_reports))
    .filter(gr => gr.is_sharpe != null && gr.oos_sharpe != null && gr.is_sharpe !== 0)
  const avgOvFit = allGradeReports.length > 0
    ? allGradeReports.reduce((acc, gr) => acc + (gr.oos_sharpe! / gr.is_sharpe!), 0) / allGradeReports.length
    : null

  return (
    <div className="container mx-auto px-4 py-10 max-w-7xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">{(cohort as Cohort).name}</span>
          </div>
          <h1 className="text-2xl font-bold">Instructor view</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">{(cohort as Cohort).type}</Badge>
          <Link href={`/dashboard/instructor/${slug}/arena`}>
            <Button variant="outline" size="sm">⚡ Arena</Button>
          </Link>
        </div>
      </div>

      {/* Queue stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
        {[
          { label: 'Members',       value: students.length },
          { label: 'No submission', value: notSubmitted,  alert: notSubmitted > 0 },
          { label: 'Pending',       value: pending },
          { label: 'Running',       value: running },
          { label: 'Failed',        value: failed, alert: failed > 0 },
        ].map(({ label, value, alert }) => (
          <Card key={label} className={alert && value > 0 ? 'border-destructive' : ''}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground font-normal">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className={`text-2xl font-bold ${alert && value > 0 ? 'text-destructive' : ''}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cohort aggregate statistics */}
      {gradedStudents.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold mb-3">Cohort statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: 'Mean OOS Sharpe',
                value: meanOos != null ? meanOos.toFixed(2) : '—',
                note: `${gradedStudents.length} graded`,
                highlight: meanOos != null && meanOos > 0,
              },
              {
                label: 'Median OOS Sharpe',
                value: medianOos != null ? medianOos.toFixed(2) : '—',
                note: 'best submission per student',
                highlight: medianOos != null && medianOos > 0,
              },
              {
                label: '% Positive OOS',
                value: pctPositive != null ? `${pctPositive}%` : '—',
                note: 'strategies that generalise',
                highlight: pctPositive != null && pctPositive > 50,
              },
              {
                label: 'Avg overfitting ratio',
                value: avgOvFit != null ? avgOvFit.toFixed(2) : '—',
                note: 'OOS ÷ IS Sharpe (target ≥ 0.7)',
                highlight: avgOvFit != null && avgOvFit >= 0.7,
              },
            ].map(({ label, value, note, highlight }) => (
              <Card key={label}>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs text-muted-foreground font-normal">{label}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className={`text-2xl font-bold font-mono ${highlight ? 'text-green-600' : ''}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{note}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Student progress table */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">Student progress</h2>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Submissions</TableHead>
                <TableHead className="text-right">Best OOS Sharpe</TableHead>
                <TableHead className="text-right">Forward Sharpe</TableHead>
                <TableHead className="text-right">Alphas found</TableHead>
                <TableHead>Last status</TableHead>
                <TableHead>Last submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map(s => (
                <TableRow key={s.userId} className={s.submissions === 0 ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className="font-medium">{s.displayName}</div>
                    <div className="text-xs text-muted-foreground">@{s.username}</div>
                  </TableCell>
                  <TableCell className="text-right">{s.submissions}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(s.bestOosSharpe)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(s.latestForwardSharpe)}</TableCell>
                  <TableCell className="text-right">{s.alphasDiscovered ?? '—'}</TableCell>
                  <TableCell>
                    {s.latestStatus ? statusBadge(s.latestStatus) : <span className="text-muted-foreground text-xs">none</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.lastSubmittedAt
                      ? new Date(s.lastSubmittedAt).toLocaleString()
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* All submissions log */}
      <section>
        <h2 className="text-lg font-semibold mb-4">All submissions</h2>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">IS Sharpe</TableHead>
                <TableHead className="text-right">OOS Sharpe</TableHead>
                <TableHead className="text-right">OvFit ratio</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map(s => {
                const gr = toArray(s.grade_reports)[0] ?? null
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">
                      {profileMap.get(s.user_id)?.display_name ?? profileMap.get(s.user_id)?.username ?? '—'}
                    </TableCell>
                    <TableCell className="font-medium text-sm max-w-[160px] truncate">
                      {s.strategy_name}
                    </TableCell>
                    <TableCell>{statusBadge(s.status)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(gr?.is_sharpe)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(gr?.oos_sharpe)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(gr?.overfitting_ratio)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(s.submitted_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                )
              })}
              {submissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No submissions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Arena seasons */}
      <section className="mt-12">
        <h2 className="text-lg font-semibold mb-4">Arena seasons</h2>
        <SeasonManager
          cohortId={(cohort as Cohort).id}
          initialSessions={seasons}
        />
      </section>

      {/* Join code */}
      {(cohort as Cohort).join_code && (
        <div className="mt-10 p-4 rounded-lg bg-muted text-sm">
          <span className="font-medium">Join code: </span>
          <code className="font-mono">{(cohort as Cohort).join_code}</code>
          <span className="text-muted-foreground ml-2">— share this with students</span>
        </div>
      )}

    </div>
  )
}
