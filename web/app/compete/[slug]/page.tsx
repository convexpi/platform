import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CompetitionOverview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: cohort } = await supabase
    .from('cohorts')
    .select('*')
    .eq('slug', slug)
    .eq('type', 'competition')
    .single()

  if (!cohort) notFound()

  // Arena (live trading) competitions have a non-empty arena_config and are
  // played by connecting an agent to the Arena WebSocket server — not by
  // submitting strategy code. Render a dedicated "connect" overview for them.
  const isArena = Object.keys((cohort.arena_config ?? {}) as Record<string, unknown>).length > 0
  if (isArena) {
    const arenaUrl = process.env.NEXT_PUBLIC_ARENA_URL || ''
    return (
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{cohort.name}</h1>
            <Badge>{cohort.status}</Badge>
          </div>
          {cohort.description && <p className="text-muted-foreground text-lg">{cohort.description}</p>}
        </div>

        <div className="flex gap-3 mb-8">
          <Link href={`/compete/${slug}/leaderboard`} className={cn(buttonVariants())}>
            Live rankings
          </Link>
          <Link href="/getting-started" className={cn(buttonVariants({ variant: 'outline' }))}>
            How it works
          </Link>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-2">Connect your agent</h2>
            {arenaUrl ? (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Point a <code>RemoteAgent</code> at the Arena and climb the PnL ladder against other
                  players and the background market. Server:
                </p>
                <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto mb-3">{`pip install convexpi-arena

from convexpi.arena import RemoteAgent, MarketState

class MyAgent(RemoteAgent):
    def on_tick(self, state: MarketState):
        if state.mid:
            return [self.limit('buy', round(state.mid) - 5, 10)]
        return []

MyAgent('your-handle', server='${arenaUrl}').run()`}</pre>
                <p className="text-xs text-muted-foreground">
                  Your PnL appears on the live rankings within a few ticks.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                The Arena server is being set up — live play opens shortly. Watch the{' '}
                <Link href={`/compete/${slug}/leaderboard`} className="underline underline-offset-4">
                  rankings
                </Link>{' '}
                in the meantime.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Participant count — distinct users with at least one completed submission
  const { count: participantCount } = await supabase
    .from('submissions')
    .select('user_id', { count: 'exact', head: true })
    .eq('cohort_id', cohort.id)
    .eq('status', 'completed')

  // Top 3 from grade_reports for the teaser
  const { data: topSubmissions } = await supabase
    .from('submissions')
    .select('strategy_name, user_id, profiles(username, display_name), grade_reports(oos_sharpe, overfitting_ratio)')
    .eq('cohort_id', cohort.id)
    .eq('status', 'completed')
    .order('submitted_at', { ascending: false })
    .limit(50)  // fetch enough to de-dup and sort in JS

  const statusColor = { upcoming: 'secondary', active: 'default', ended: 'outline' } as const

  // De-dup to best per user, sort by OOS Sharpe, take top 3
  type TopEntry = { username: string; strategyName: string; oosSharpe: number | null; overfitRatio: number | null }
  const byUser = new Map<string, TopEntry>()

  for (const row of topSubmissions ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const report = Array.isArray((row as any).grade_reports)
      ? (row as any).grade_reports[0]
      : (row as any).grade_reports
    if (!report) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = Array.isArray((row as any).profiles)
      ? (row as any).profiles[0]
      : (row as any).profiles

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

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{cohort.name}</h1>
          <Badge variant={statusColor[cohort.status as keyof typeof statusColor]}>{cohort.status}</Badge>
        </div>
        {cohort.description && (
          <p className="text-muted-foreground text-lg">{cohort.description}</p>
        )}
        <div className="flex gap-6 mt-4 text-sm text-muted-foreground">
          {cohort.start_date && (
            <span>Starts {new Date(cohort.start_date).toLocaleDateString('en-US', { dateStyle: 'long' })}</span>
          )}
          {cohort.end_date && (
            <span>Ends {new Date(cohort.end_date).toLocaleDateString('en-US', { dateStyle: 'long' })}</span>
          )}
          {participantCount != null && participantCount > 0 && (
            <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Anonymous CTA */}
      {!user && cohort.status === 'active' && (
        <div className="rounded-lg border bg-muted/30 p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold mb-1">Ready to compete?</p>
            <p className="text-sm text-muted-foreground">
              Sign up for free, run Mission 1 in Colab, and submit your strategy in under 30 minutes.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/getting-started" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              How it works
            </Link>
            <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
              Sign up free
            </Link>
          </div>
        </div>
      )}

      {/* Logged-in CTA */}
      {user && cohort.status === 'active' && (
        <div className="flex gap-3 mb-8">
          <Link href={`/compete/${slug}/submit`} className={cn(buttonVariants())}>
            Submit strategy
          </Link>
          <Link href={`/compete/${slug}/leaderboard`} className={cn(buttonVariants({ variant: 'outline' }))}>
            Full leaderboard
          </Link>
        </div>
      )}

      {cohort.status !== 'active' && (
        <div className="flex gap-3 mb-8">
          <Link href={`/compete/${slug}/leaderboard`} className={cn(buttonVariants({ variant: 'outline' }))}>
            View leaderboard
          </Link>
        </div>
      )}

      {/* How scoring works */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">How scoring works</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'OOS Sharpe', desc: 'Measured on a hidden holdout period. The only trusted score.' },
            { label: 'Overfitting ratio', desc: 'OOS ÷ IS Sharpe. Target ≥ 70%. Penalizes in-sample curve fitting.' },
            { label: 'Forward Sharpe', desc: 'Updated nightly on fresh synthetic data. Tracks real generalization.' },
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
            <Link href={`/compete/${slug}/leaderboard`} className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground">
              Full leaderboard →
            </Link>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground w-10">#</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Participant</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Strategy</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">OOS Sharpe</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {top3.map((entry, i) => (
                  <tr key={entry.username} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground font-mono">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </td>
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

      {/* How to participate */}
      {!user && (
        <section>
          <h2 className="text-lg font-semibold mb-4">How to participate</h2>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
            <li><Link href="/getting-started" className="underline underline-offset-4 text-foreground">Follow the getting-started guide</Link> — takes about 30 minutes.</li>
            <li>Run Mission 1 in Colab. No local Python install needed.</li>
            <li><Link href="/signup" className="underline underline-offset-4 text-foreground">Create an account</Link> and submit your strategy from the editor.</li>
            <li>Your OOS Sharpe appears on this leaderboard after grading (under 5 minutes).</li>
          </ol>
        </section>
      )}
    </div>
  )
}
