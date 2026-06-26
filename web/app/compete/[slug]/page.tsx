import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ArenaBook } from '@/components/arena-book'
import { submitSp500Model } from '../sp500-actions'

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
  const arenaConfig = (cohort.arena_config ?? {}) as Record<string, unknown>
  const isArena = Object.keys(arenaConfig).length > 0

  // What data is this competition graded on? Prefer an explicit note in market_config, else a
  // sensible default by type.
  const marketCfg = (cohort.market_config ?? {}) as Record<string, unknown>
  const dataNote = (typeof marketCfg.data_description === 'string' && marketCfg.data_description)
    || (isArena
      ? 'Played live against a limit order book — your agent posts and takes orders in real time.'
      : 'Graded on a hidden synthetic market: a simulated cross-section of stocks with planted alphas to discover, split into in-sample and out-of-sample. Your score is the out-of-sample Sharpe — the part that can’t be overfit.')

  // The S&P-500 next-day competition is its own game (live forecasts on real prices).
  if (slug === 'sp500-nextday') {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: models } = await supabase.from('sp500_models').select('id, name, user_id').eq('status', 'active')
    const { data: scores } = await supabase.from('sp500_scores').select('model_id, hit_rate, cum_return, sharpe, n_days, last_date')
    type Score = { model_id: string; hit_rate: number; cum_return: number; sharpe: number; n_days: number; last_date: string }
    const sBy = new Map((scores ?? []).map((s) => [(s as Score).model_id, s as Score]))
    const uIds = [...new Set((models ?? []).map((m) => m.user_id).filter(Boolean))] as string[]
    const { data: profs } = uIds.length
      ? await supabase.from('profiles').select('id, username, display_name').in('id', uIds)
      : { data: [] as { id: string; username: string | null; display_name: string | null }[] }
    const pBy = new Map((profs ?? []).map((p) => [p.id, p]))
    const rows = (models ?? []).map((m) => {
      const p = m.user_id ? pBy.get(m.user_id) : null
      return { id: m.id as string, name: m.name as string, mine: !!user && m.user_id === user.id,
               author: m.user_id ? (p?.display_name || (p?.username ? `@${p.username}` : 'someone')) : 'ConvexPi',
               s: sBy.get(m.id as string) }
    }).sort((a, b) => (b.s?.sharpe ?? -Infinity) - (a.s?.sharpe ?? -Infinity))
    const lastDate = (scores ?? [])[0] ? (scores as Score[]).map(s => s.last_date).sort().slice(-1)[0] : null

    const TEMPLATE = `def predict(history):
    # history: a pandas DataFrame of daily S&P 500 closes (column 'close'),
    # up to and including today. Return your forecast of TOMORROW's return.
    c = history['close']
    return float(c.iloc[-1] / c.iloc[-6] - 1)   # 5-day momentum (replace me)`

    return (
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <Link href="/compete" className="text-sm text-muted-foreground hover:text-foreground">← Competitions</Link>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{cohort.name}</h1>
            <Badge>live</Badge>
          </div>
          {cohort.description && <p className="text-muted-foreground text-lg">{cohort.description}</p>}
          <div className="mt-4 rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Data &amp; scoring:</span> {dataNote}
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-3">Standings {lastDate && <span className="text-sm font-normal text-muted-foreground">· through {lastDate}</span>}</h2>
        <div className="rounded-xl border border-border overflow-hidden mb-10">
          <table className="w-full text-sm">
            <thead><tr className="bg-secondary/50 text-xs text-muted-foreground">
              <th className="text-left px-3 py-2">#</th><th className="text-left px-3 py-2">Model</th>
              <th className="text-right px-3 py-2">Hit rate</th><th className="text-right px-3 py-2">Cum. PnL</th>
              <th className="text-right px-3 py-2">Sharpe</th><th className="text-right px-3 py-2">Days</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={r.id} className={r.mine ? 'bg-[#C9A34E]/5' : ''}>
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2"><span className="font-medium text-foreground">{r.name}</span> <span className="text-xs text-muted-foreground">{r.author}</span></td>
                  <td className="px-3 py-2 text-right font-mono">{r.s ? `${(r.s.hit_rate * 100).toFixed(0)}%` : '—'}</td>
                  <td className={`px-3 py-2 text-right font-mono ${(r.s?.cum_return ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{r.s ? `${(r.s.cum_return * 100).toFixed(1)}%` : '—'}</td>
                  <td className={`px-3 py-2 text-right font-mono font-semibold ${(r.s?.sharpe ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{r.s ? r.s.sharpe.toFixed(2) : '—'}</td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{r.s?.n_days ?? '—'}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No models yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <h2 className="text-lg font-semibold mb-2">Compete</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Submit a Python <code>predict(history)</code> that forecasts the next day&apos;s return. It&apos;s
          scored walk-forward on real prices and re-scored daily as new sessions arrive — ranked by the
          Sharpe of its directional bets. Sign of your forecast = your bet (up/down).
        </p>
        {user ? (
          <form action={submitSp500Model} className="space-y-3">
            <input name="name" required maxLength={80} placeholder="Model name"
              className="w-full text-sm border rounded-lg px-3 py-2 bg-background" />
            <textarea name="code" required rows={7} defaultValue={TEMPLATE}
              className="w-full font-mono text-xs border rounded-lg px-3 py-2 bg-background" />
            <button type="submit" className={cn(buttonVariants({ size: 'sm' }))}>Submit model</button>
            <p className="text-xs text-muted-foreground">Must define <code>predict(history)</code>. Runs sandboxed; results appear after the next scoring run.</p>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground"><Link href="/login" className="underline underline-offset-4">Sign in</Link> to submit a model.</p>
        )}
      </div>
    )
  }

  if (isArena) {
    // Per-competition websocket URL: an explicit ws_url in arena_config wins, then a slug-specific
    // env (book runs on its own server), then the shared default.
    const arenaUrl =
      (typeof arenaConfig.ws_url === 'string' ? arenaConfig.ws_url : '') ||
      (slug === 'arena-book' ? (process.env.NEXT_PUBLIC_ARENA_BOOK_URL ?? '') : '') ||
      (slug === 'arena-l3' ? (process.env.NEXT_PUBLIC_ARENA_L3_URL ?? '') : '') ||
      // Only the generic ladder falls back to the shared server — book/L3 are their own instances.
      (slug === 'arena-open' ? (process.env.NEXT_PUBLIC_ARENA_URL ?? '') : '')
    return (
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <Link href="/compete" className="text-sm text-muted-foreground hover:text-foreground">← Competitions</Link>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{cohort.name}</h1>
            <Badge>{cohort.status}</Badge>
          </div>
          {cohort.description && <p className="text-muted-foreground text-lg">{cohort.description}</p>}
          <div className="mt-4 rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Data &amp; scoring:</span> {dataNote}
          </div>
        </div>

        <div className="flex gap-3 mb-8">
          <Link href={`/compete/${slug}/leaderboard`} className={cn(buttonVariants())}>
            Live rankings
          </Link>
          <Link href="/exchange" className={cn(buttonVariants({ variant: 'outline' }))}>
            How matching works
          </Link>
        </div>

        {arenaUrl && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-2">Live order book</h2>
            <ArenaBook url={arenaUrl} />
          </div>
        )}

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

  // PostgREST returns embedded relations as either an object or a single-element array.
  type GradeReport = { oos_sharpe: number | null; overfitting_ratio: number | null }
  type Profile = { username: string | null; display_name: string | null }
  const firstOf = <T,>(e: T | T[] | null | undefined): T | null =>
    Array.isArray(e) ? (e[0] ?? null) : (e ?? null)

  for (const row of topSubmissions ?? []) {
    const report = firstOf(row.grade_reports as GradeReport | GradeReport[] | null)
    if (!report) continue
    const profile = firstOf(row.profiles as Profile | Profile[] | null)

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
      <Link href="/compete" className="text-sm text-muted-foreground hover:text-foreground">← Competitions</Link>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{cohort.name}</h1>
          <Badge variant={statusColor[cohort.status as keyof typeof statusColor]}>{cohort.status}</Badge>
        </div>
        {cohort.description && (
          <p className="text-muted-foreground text-lg">{cohort.description}</p>
        )}
        <div className="mt-4 rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Data &amp; scoring:</span> {dataNote}
        </div>
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
