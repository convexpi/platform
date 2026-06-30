import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ArenaBook } from '@/components/arena-book'
import { submitSp500Model } from '../sp500-actions'
import { STARTERS, competitionKind } from '@/lib/starters'
import { competitionSpec } from '@/lib/competition-spec'
import { SpecHeader, SpecSection, SpecNav, CanonicalSpecSections, CANONICAL_NAV } from '@/components/competition-spec'

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

  const arenaConfig = (cohort.arena_config ?? {}) as Record<string, unknown>
  const isArena = Object.keys(arenaConfig).length > 0
  const kind = competitionKind(cohort)
  const starter = STARTERS[kind]
  const spec = competitionSpec(cohort)

  // An explicit per-competition data note (market_config.data_description) overrides the
  // kind's default data summary.
  const marketCfg = (cohort.market_config ?? {}) as Record<string, unknown>
  const dataSummary = (typeof marketCfg.data_description === 'string' && marketCfg.data_description) || undefined

  const back = <Link href="/compete" className="text-sm text-muted-foreground hover:text-foreground">← Competitions</Link>

  // ---------------------------------------------------------------------------
  // S&P next-day forecast — its own game (live forecasts on real prices)
  // ---------------------------------------------------------------------------
  if (slug === 'sp500-nextday') {
    const { data: models } = await supabase.from('sp500_models').select('id, name, user_id').eq('status', 'active')
    const { data: scores } = await supabase.from('sp500_scores').select('model_id, hit_rate, cum_return, sharpe, n_days, last_date, live_sharpe, live_days, live_cum_return')
    type Score = { model_id: string; hit_rate: number; cum_return: number; sharpe: number; n_days: number; last_date: string; live_sharpe: number | null; live_days: number | null; live_cum_return: number | null }
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
    }).sort((a, b) =>   // live track leads once it exists; backtest Sharpe breaks ties / orders new models
      (b.s?.live_sharpe ?? -Infinity) - (a.s?.live_sharpe ?? -Infinity) || (b.s?.sharpe ?? -Infinity) - (a.s?.sharpe ?? -Infinity))
    const lastDate = (scores ?? [])[0] ? (scores as Score[]).map(s => s.last_date).sort().slice(-1)[0] : null

    const TEMPLATE = spec.submit.example

    return (
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        {back}
        <SpecHeader name={cohort.name} status={<Badge>live</Badge>} description={cohort.description} facts={spec.facts} />
        <SpecNav items={[{ id: 'standings', label: 'Standings' }, ...CANONICAL_NAV, { id: 'get-started', label: 'Get started' }]} />

        <SpecSection id="standings" title={`Standings${lastDate ? ` · through ${lastDate}` : ''}`}>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-secondary/50 text-xs text-muted-foreground">
                <th className="text-left px-3 py-2">#</th><th className="text-left px-3 py-2">Model</th>
                <th className="text-right px-3 py-2">Live Sharpe</th><th className="text-right px-3 py-2">Live days</th>
                <th className="text-right px-3 py-2">Backtest (252d)</th><th className="text-right px-3 py-2">Hit</th>
                <th className="text-right px-3 py-2">Cum. PnL</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => {
                  const liveSharpe = r.s?.live_sharpe
                  const liveDays = r.s?.live_days ?? 0
                  return (
                  <tr key={r.id} className={r.mine ? 'bg-[#C9A34E]/5' : ''}>
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2"><span className="font-medium text-foreground">{r.name}</span> <span className="text-xs text-muted-foreground">{r.author}</span></td>
                    <td className={`px-3 py-2 text-right font-mono font-semibold ${liveSharpe == null ? 'text-muted-foreground' : liveSharpe >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{liveSharpe == null ? '—' : liveSharpe.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{liveDays}</td>
                    <td className={`px-3 py-2 text-right font-mono ${(r.s?.sharpe ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{r.s ? r.s.sharpe.toFixed(2) : '—'}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.s ? `${(r.s.hit_rate * 100).toFixed(0)}%` : '—'}</td>
                    <td className={`px-3 py-2 text-right font-mono ${(r.s?.cum_return ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{r.s ? `${(r.s.cum_return * 100).toFixed(1)}%` : '—'}</td>
                  </tr>
                  )
                })}
                {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No models yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="text-foreground">Live</span> = forward-only track since each model went active (the honest score; it grows daily).{' '}
            <span className="text-foreground">Backtest</span> = a rolling 252-day walk-forward over real prices, recomputed daily — a baseline that’s comparable from day one.
          </p>
        </SpecSection>

        <CanonicalSpecSections spec={spec} dataSummary={dataSummary} />

        <SpecSection id="get-started" title="Get started">
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside mb-4">
            <li><a href={starter.url} target="_blank" rel="noopener noreferrer" className="text-[#C9A34E] hover:text-[#b8922d] underline underline-offset-4">Open the starter notebook</a> — pull the real index and backtest <code className="bg-muted px-1 rounded text-xs">predict(history)</code> walk-forward.</li>
            <li>Paste your function below and submit.</li>
            <li>It&apos;s re-scored daily on live prices; your Sharpe climbs the standings.</li>
          </ol>
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
        </SpecSection>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Arena — live trading against a limit-order book
  // ---------------------------------------------------------------------------
  if (isArena) {
    const arenaUrl =
      (typeof arenaConfig.ws_url === 'string' ? arenaConfig.ws_url : '') ||
      (slug === 'arena-book' ? (process.env.NEXT_PUBLIC_ARENA_BOOK_URL ?? '') : '') ||
      (slug === 'arena-l3' ? (process.env.NEXT_PUBLIC_ARENA_L3_URL ?? '') : '') ||
      (slug === 'arena-open' ? (process.env.NEXT_PUBLIC_ARENA_URL ?? '') : '')
    return (
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        {back}
        <SpecHeader name={cohort.name} status={<Badge>{cohort.status}</Badge>} description={cohort.description} facts={spec.facts} />
        <SpecNav items={[...(arenaUrl ? [{ id: 'order-book', label: 'Live order book' }] : []), ...CANONICAL_NAV, { id: 'get-started', label: 'Get started' }]} />

        <div className="flex gap-3 mb-8 flex-wrap">
          <Link href={`/compete/${slug}/leaderboard`} className={cn(buttonVariants())}>Live rankings</Link>
          <Link href="/exchange" className={cn(buttonVariants({ variant: 'outline' }))}>How matching works</Link>
        </div>

        {arenaUrl && (
          <SpecSection id="order-book" title="Live order book">
            <ArenaBook url={arenaUrl} />
          </SpecSection>
        )}

        <CanonicalSpecSections spec={spec} dataSummary={dataSummary} />

        <SpecSection id="get-started" title="Get started">
          {arenaUrl ? (
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside mb-4">
              <li><a href={starter.url} target="_blank" rel="noopener noreferrer" className="text-[#C9A34E] hover:text-[#b8922d] underline underline-offset-4">Open the starter notebook</a> — connect a baseline agent and watch the book.</li>
              <li>Point your <code className="bg-muted px-1 rounded text-xs">RemoteAgent</code> at <code className="bg-muted px-1 rounded text-xs break-all">{arenaUrl}</code> and quote a market.</li>
              <li>Your PnL appears on the <Link href={`/compete/${slug}/leaderboard`} className="underline underline-offset-4">live rankings</Link> within a few ticks.</li>
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              The Arena server is being set up — live play opens shortly. Watch the{' '}
              <Link href={`/compete/${slug}/leaderboard`} className="underline underline-offset-4">rankings</Link> in the meantime.
            </p>
          )}
        </SpecSection>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Lab — submit a strategy, graded on a hidden synthetic market
  // ---------------------------------------------------------------------------
  // Public standings: read via the service client (RLS on submissions restricts reads to
  // owner/members, which would otherwise blank the board for an open competition).
  const publicDb = createAdminClient()
  const { count: participantCount } = await publicDb
    .from('submissions')
    .select('user_id', { count: 'exact', head: true })
    .eq('cohort_id', cohort.id)
    .eq('status', 'completed')

  const { data: topSubmissions } = await publicDb
    .from('submissions')
    .select('strategy_name, user_id, grade_reports(oos_sharpe, overfitting_ratio)')
    .eq('cohort_id', cohort.id)
    .eq('status', 'completed')
    .order('submitted_at', { ascending: false })
    .limit(50)

  const statusColor = { upcoming: 'secondary', active: 'default', ended: 'outline' } as const

  type TopEntry = { username: string; strategyName: string; oosSharpe: number | null; overfitRatio: number | null }
  const byUser = new Map<string, TopEntry>()
  type GradeReport = { oos_sharpe: number | null; overfitting_ratio: number | null }
  const firstOf = <T,>(e: T | T[] | null | undefined): T | null =>
    Array.isArray(e) ? (e[0] ?? null) : (e ?? null)

  // profiles can't be embedded on submissions (no FK to profiles); resolve names separately.
  const topUserIds = [...new Set((topSubmissions ?? []).map(r => r.user_id).filter(Boolean))]
  const { data: topProfiles } = topUserIds.length
    ? await publicDb.from('profiles').select('id, username, display_name').in('id', topUserIds)
    : { data: [] as { id: string; username: string | null; display_name: string | null }[] }
  const topProfileById = new Map((topProfiles ?? []).map(p => [p.id, p]))

  for (const row of topSubmissions ?? []) {
    const report = firstOf(row.grade_reports as GradeReport | GradeReport[] | null)
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

  const metaBits: string[] = []
  if (cohort.start_date) metaBits.push(`Starts ${new Date(cohort.start_date).toLocaleDateString('en-US', { dateStyle: 'long' })}`)
  if (cohort.end_date) metaBits.push(`Ends ${new Date(cohort.end_date).toLocaleDateString('en-US', { dateStyle: 'long' })}`)
  if (participantCount != null && participantCount > 0) metaBits.push(`${participantCount} participant${participantCount !== 1 ? 's' : ''}`)

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      {back}
      <SpecHeader name={cohort.name} status={<Badge variant={statusColor[cohort.status as keyof typeof statusColor]}>{cohort.status}</Badge>} description={cohort.description} facts={spec.facts} />

      {metaBits.length > 0 && (
        <p className="-mt-4 mb-6 text-sm text-muted-foreground">{metaBits.join(' · ')}</p>
      )}
      <SpecNav items={[...(top3.length > 0 ? [{ id: 'standings', label: 'Standings' }] : []), ...CANONICAL_NAV, { id: 'get-started', label: 'Get started' }]} />

      {/* Primary CTA */}
      {user && cohort.status === 'active' && (
        <div className="flex gap-3 mb-8 flex-wrap">
          <Link href={`/compete/${slug}/submit`} className={cn(buttonVariants())}>Submit strategy</Link>
          <Link href={`/compete/${slug}/leaderboard`} className={cn(buttonVariants({ variant: 'outline' }))}>Full leaderboard</Link>
        </div>
      )}
      {!user && cohort.status === 'active' && (
        <div className="rounded-lg border bg-muted/30 p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold mb-1">Ready to compete?</p>
            <p className="text-sm text-muted-foreground">Sign up free, fit a strategy in Colab, and submit in under 30 minutes.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/getting-started" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>How it works</Link>
            <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>Sign up free</Link>
          </div>
        </div>
      )}
      {cohort.status !== 'active' && (
        <div className="flex gap-3 mb-8">
          <Link href={`/compete/${slug}/leaderboard`} className={cn(buttonVariants({ variant: 'outline' }))}>View leaderboard</Link>
        </div>
      )}

      {/* Current standings teaser */}
      {top3.length > 0 && (
        <SpecSection id="standings" title="Current standings">
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
                    <td className="px-4 py-3 text-muted-foreground font-mono">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</td>
                    <td className="px-4 py-3 font-medium">{entry.username}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{entry.strategyName}</td>
                    <td className={`px-4 py-3 text-right font-mono tabular-nums font-semibold ${entry.oosSharpe != null && entry.oosSharpe > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.oosSharpe != null ? entry.oosSharpe.toFixed(3) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href={`/compete/${slug}/leaderboard`} className="inline-block mt-3 text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground">Full leaderboard →</Link>
        </SpecSection>
      )}

      <CanonicalSpecSections spec={spec} dataSummary={dataSummary} />

      <SpecSection title="Get started">
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside mb-4">
          <li><a href={starter.url} target="_blank" rel="noopener noreferrer" className="text-[#C9A34E] hover:text-[#b8922d] underline underline-offset-4">Open the starter notebook</a> — get the in-sample data, fit a strategy, and check it out-of-sample.</li>
          <li>{user
            ? <><Link href={`/compete/${slug}/submit`} className="underline underline-offset-4 text-foreground">Submit your strategy</Link> from the editor.</>
            : <><Link href="/signup" className="underline underline-offset-4 text-foreground">Create a free account</Link> and submit from the editor.</>}</li>
          <li>Your OOS Sharpe posts to the leaderboard in under 5 minutes.</li>
        </ol>
      </SpecSection>
    </div>
  )
}
