import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Sparkline } from '@/components/sparkline'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ClassroomOverview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: cohort } = await supabase
    .from('cohorts')
    .select('*')
    .eq('slug', slug)
    .eq('type', 'classroom')
    .single()

  if (!cohort) notFound()

  // Private classrooms require membership
  if (cohort.visibility === 'private') {
    if (!user) redirect(`/login?next=/classroom/${slug}`)
    const { data: membership } = await supabase
      .from('cohort_members')
      .select('id')
      .eq('cohort_id', cohort.id)
      .eq('user_id', user.id)
      .single()
    if (!membership) {
      // Not a member — show join page instead of 404
      return <JoinPrompt slug={slug} name={cohort.name} joinCode={null} />
    }
  }

  // Member count
  const { count: memberCount } = await supabase
    .from('cohort_members')
    .select('id', { count: 'exact', head: true })
    .eq('cohort_id', cohort.id)

  // Submission count for the cohort
  const { count: submissionCount } = await supabase
    .from('submissions')
    .select('user_id', { count: 'exact', head: true })
    .eq('cohort_id', cohort.id)
    .eq('status', 'completed')

  // Current user's own graded submissions — for the personal progress card
  let userHasSubmitted = false
  let myBestOos: number | null = null
  const myOosSeries: number[] = []
  let mySubmissionCount = 0
  if (user) {
    const { data: mine } = await supabase
      .from('submissions')
      .select('submitted_at, status, grade_reports(oos_sharpe)')
      .eq('cohort_id', cohort.id)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('submitted_at', { ascending: true })
    mySubmissionCount = (mine ?? []).length
    userHasSubmitted = mySubmissionCount > 0
    for (const row of mine ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const report = Array.isArray((row as any).grade_reports) ? (row as any).grade_reports[0] : (row as any).grade_reports
      const oos = report?.oos_sharpe as number | null | undefined
      if (oos == null) continue
      myOosSeries.push(oos)
      if (myBestOos == null || oos > myBestOos) myBestOos = oos
    }
  }

  // Top 3 from grade_reports (read via service client: members should see the class board, and
  // the page already gates access for private classrooms above).
  const adminDb = createAdminClient()
  const { data: topSubmissions } = await adminDb
    .from('submissions')
    .select('strategy_name, user_id, grade_reports(oos_sharpe, overfitting_ratio)')
    .eq('cohort_id', cohort.id)
    .eq('status', 'completed')
    .order('submitted_at', { ascending: false })
    .limit(100)

  // profiles can't be embedded on submissions (no FK to profiles); resolve names separately.
  const topUserIds = [...new Set((topSubmissions ?? []).map(r => r.user_id).filter(Boolean))]
  const { data: topProfiles } = topUserIds.length
    ? await adminDb.from('profiles').select('id, username, display_name').in('id', topUserIds)
    : { data: [] as { id: string; username: string | null; display_name: string | null }[] }
  const topProfileById = new Map((topProfiles ?? []).map(p => [p.id, p]))

  type TopEntry = { username: string; strategyName: string; oosSharpe: number | null; overfitRatio: number | null }
  const byUser = new Map<string, TopEntry>()
  for (const row of topSubmissions ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const report = Array.isArray((row as any).grade_reports) ? (row as any).grade_reports[0] : (row as any).grade_reports
    if (!report) continue
    const profile = topProfileById.get(row.user_id) ?? null
    const oosSharpe = report.oos_sharpe as number | null
    const existing = byUser.get(row.user_id)
    if (existing && (oosSharpe == null || (existing.oosSharpe != null && oosSharpe <= existing.oosSharpe))) continue
    byUser.set(row.user_id, {
      username: profile?.display_name ?? profile?.username ?? row.user_id.slice(0, 8),
      strategyName: row.strategy_name,
      oosSharpe,
      overfitRatio: report.overfitting_ratio as number | null,
    })
  }
  const top3 = Array.from(byUser.values())
    .sort((a, b) => (b.oosSharpe ?? -Infinity) - (a.oosSharpe ?? -Infinity))
    .slice(0, 3)

  const statusColor = { upcoming: 'secondary', active: 'default', ended: 'outline' } as const
  const isMember = !!user

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-3 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <h1 className="text-3xl font-bold">{cohort.name}</h1>
              <Badge variant={statusColor[cohort.status as keyof typeof statusColor]}>{cohort.status}</Badge>
              {cohort.visibility === 'private' && (
                <Badge variant="outline" className="text-xs">Private</Badge>
              )}
            </div>
            {cohort.description && (
              <p className="text-muted-foreground text-lg">{cohort.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-6 mt-4 text-sm text-muted-foreground flex-wrap">
          {cohort.start_date && (
            <span>Starts {new Date(cohort.start_date).toLocaleDateString('en-US', { dateStyle: 'long' })}</span>
          )}
          {cohort.end_date && (
            <span>Ends {new Date(cohort.end_date).toLocaleDateString('en-US', { dateStyle: 'long' })}</span>
          )}
          {memberCount != null && memberCount > 0 && (
            <Link href={`/classroom/${slug}/members`} className="hover:text-foreground transition-colors">
              {memberCount} {memberCount === 1 ? 'student' : 'students'}
            </Link>
          )}
          {submissionCount != null && submissionCount > 0 && (
            <span>{submissionCount} submission{submissionCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* CTA bar */}
      {isMember && cohort.status === 'active' && (
        <div className="flex gap-3 mb-8 flex-wrap">
          <Link href={`/classroom/${slug}/submit`} className={cn(buttonVariants())}>
            {userHasSubmitted ? 'Resubmit strategy' : 'Submit strategy'}
          </Link>
          <Link href={`/classroom/${slug}/leaderboard`} className={cn(buttonVariants({ variant: 'outline' }))}>
            Leaderboard
          </Link>
          <Link href={`/classroom/${slug}/members`} className={cn(buttonVariants({ variant: 'outline' }))}>
            Members
          </Link>
        </div>
      )}

      {cohort.status !== 'active' && isMember && (
        <div className="flex gap-3 mb-8">
          <Link href={`/classroom/${slug}/leaderboard`} className={cn(buttonVariants({ variant: 'outline' }))}>
            View leaderboard
          </Link>
          <Link href={`/classroom/${slug}/members`} className={cn(buttonVariants({ variant: 'outline' }))}>
            Members
          </Link>
        </div>
      )}

      {/* Your progress — personal learning loop */}
      {isMember && userHasSubmitted && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Your progress</h2>
          <div className="rounded-lg border p-5 flex flex-wrap items-center gap-x-10 gap-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Best OOS Sharpe</p>
              <p className={`text-2xl font-bold font-mono ${myBestOos != null && myBestOos > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {myBestOos != null ? myBestOos.toFixed(3) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Graded submissions</p>
              <p className="text-2xl font-bold font-mono">{mySubmissionCount}</p>
            </div>
            {myOosSeries.length >= 2 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">OOS over attempts</p>
                <div className="flex items-center gap-2">
                  <Sparkline points={myOosSeries} width={120} height={28} />
                  {(() => {
                    const d = myOosSeries[myOosSeries.length - 1] - myOosSeries[0]
                    return (
                      <span className={`text-xs font-mono ${d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {d >= 0 ? '▲' : '▼'} {Math.abs(d).toFixed(2)}
                      </span>
                    )
                  })()}
                </div>
              </div>
            )}
            <div className="ml-auto">
              <Link href={`/classroom/${slug}/submit`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                Improve your score →
              </Link>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            The honest goal isn’t a high in-sample score — it’s a trajectory that holds up out of sample.
          </p>
        </section>
      )}

      {/* How scoring works */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">How scoring works</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'OOS Sharpe', desc: 'Your strategy is graded on a holdout period you have never seen. This is the only trusted score.' },
            { label: 'Overfitting ratio', desc: 'OOS ÷ IS Sharpe. Target ≥ 70%. A high ratio means your model actually generalised.' },
            { label: 'IS Sharpe', desc: 'Your training-period score. High IS with low OOS is the canonical overfitting signal.' },
          ].map(({ label, desc }) => (
            <Card key={label} className="bg-muted/20">
              <CardContent className="pt-4">
                <p className="font-semibold text-sm mb-1">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Top 3 teaser */}
      {top3.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Current standings</h2>
            <Link href={`/classroom/${slug}/leaderboard`}
              className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground">
              Full leaderboard →
            </Link>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground w-10">#</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Student</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Strategy</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">OOS Sharpe</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {top3.map((entry, i) => (
                  <tr key={entry.username} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-sm">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{entry.username}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{entry.strategyName}</td>
                    <td className={`px-4 py-3 text-right font-mono tabular-nums font-semibold ${
                      entry.oosSharpe != null && entry.oosSharpe > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {entry.oosSharpe != null ? entry.oosSharpe.toFixed(3) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Getting started (for members who haven't submitted) */}
      {isMember && !userHasSubmitted && cohort.status === 'active' && (
        <section className="rounded-lg border bg-muted/20 p-6">
          <h2 className="text-base font-semibold mb-3">Getting started</h2>
          <ol className="space-y-2.5 text-sm text-muted-foreground list-decimal list-inside">
            <li>
              <Link href="/getting-started" className="underline underline-offset-4 text-foreground">
                Follow the getting-started guide
              </Link>{' '}
              — takes about 30 minutes.
            </li>
            <li>Open Mission 1 in Colab. No local Python install needed.</li>
            <li>
              <Link href={`/classroom/${slug}/submit`} className="underline underline-offset-4 text-foreground">
                Submit your strategy
              </Link>{' '}
              — your OOS Sharpe appears on the leaderboard within a few minutes.
            </li>
          </ol>
        </section>
      )}
    </div>
  )
}

function JoinPrompt({ slug, name, joinCode }: { slug: string; name: string; joinCode: string | null }) {
  return (
    <div className="container mx-auto px-4 py-20 max-w-md text-center">
      <p className="text-4xl mb-4">🔒</p>
      <h1 className="text-2xl font-bold mb-2">{name}</h1>
      <p className="text-muted-foreground mb-6">This classroom is private. You need an invitation or join code to access it.</p>
      {joinCode && (
        <p className="text-sm text-muted-foreground mb-6">
          Join code: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{joinCode}</code>
        </p>
      )}
      <div className="flex gap-3 justify-center">
        <Link href="/" className={cn(buttonVariants({ variant: 'outline' }))}>Go home</Link>
        <Link href={`/classroom/${slug}/join`} className={cn(buttonVariants())}>Enter join code</Link>
      </div>
    </div>
  )
}
