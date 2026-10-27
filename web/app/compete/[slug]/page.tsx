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
import { arenaConnectUrl } from '@/lib/arena-url'
import { SpecHeader, SpecSection, SpecNav, CanonicalSpecSections, CANONICAL_NAV } from '@/components/competition-spec'
import { LIVE_MIN_DAYS, colorSlots, compareSp500, confidenceBand, liveQualified, liveSharpeStdError, type Sp500Score } from '@/lib/sp500-scoring'
import { Sp500LiveCurves, type Curve } from '@/components/sp500-live-curves'

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
    // select('*') rather than naming columns: the cost/deflation and model-status migrations may
    // not have been applied yet, and naming a missing column errors the whole query, which would
    // blank the standings instead of degrading one cell.
    const { data: models } = await supabase.from('sp500_models').select('*').eq('status', 'active')
    const { data: scores } = await supabase.from('sp500_scores').select('*')
    type Score = Sp500Score & { model_id: string; last_date: string }
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
               // Present only after 20260731_sp500_model_status.sql; undefined reads as "no error".
               error: (m as { last_error?: string | null }).last_error ?? null,
               s: sBy.get(m.id as string) }
    }).sort(compareSp500)   // live track leads once it has enough sessions to mean anything; backtest orders the rest
    const lastDate = (scores ?? [])[0] ? (scores as Score[]).map(s => s.last_date).sort().slice(-1)[0] : null

    // ---- Vol-scaled live equity curves -------------------------------------------------------
    // The realized forward PnLs are the live track itself, so the chart and the Live columns can
    // never disagree. Each model is rescaled to a common target vol before compounding: without
    // that, the curves rank leverage rather than skill.
    const TARGET_VOL = 0.10                                   // annualised
    const dailyTarget = TARGET_VOL / Math.sqrt(252)
    const { data: fc } = await supabase.from('sp500_forecasts')
      .select('model_id, as_of, pnl').not('pnl', 'is', null).order('as_of', { ascending: true })
    const byModel = new Map<string, { as_of: string; pnl: number }[]>()
    for (const f of (fc ?? []) as { model_id: string; as_of: string; pnl: number }[]) {
      const arr = byModel.get(f.model_id) ?? []
      arr.push({ as_of: f.as_of, pnl: f.pnl })
      byModel.set(f.model_id, arr)
    }
    const chartDates = [...new Set((fc ?? []).map((f) => (f as { as_of: string }).as_of))].sort()
    const dateIdx = new Map(chartDates.map((d, i) => [d, i]))
    const curves: Curve[] = rows.flatMap((r) => {
      const series = byModel.get(r.id)
      if (!series || series.length < 2) return []
      const mean = series.reduce((a, s) => a + s.pnl, 0) / series.length
      const sd = Math.sqrt(series.reduce((a, s) => a + (s.pnl - mean) ** 2, 0) / series.length)
      if (!(sd > 1e-12)) return []                             // a flat model has no vol to scale to
      const scale = dailyTarget / sd
      const points: (number | null)[] = new Array(chartDates.length).fill(null)
      let equity = 1
      for (const s of series) {
        const i = dateIdx.get(s.as_of)
        if (i == null) continue
        equity *= 1 + scale * s.pnl
        points[i] = equity - 1
      }
      return [{ id: r.id, name: r.name, author: r.author, points, scale }]
    })
    // Colour identifies the model, not its rank — assigned over the full active set so a series
    // keeps its colour when the standings reorder.
    const slots = colorSlots(rows.map((r) => r.id))
    for (const c of curves) c.slot = slots.get(c.id)

    // Standard error of an annualised Sharpe from the shortest live record on the board. Computed
    // rather than hardcoded: it was written as "at 21 days" and was stale within a session.
    const shortestLive = Math.min(...rows.map((r) => r.s?.live_days ?? 0).filter((d) => d > 0), Infinity)
    const worstSe = Number.isFinite(shortestLive) ? liveSharpeStdError(shortestLive) : null

    const TEMPLATE = spec.submit.example

    return (
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        {back}
        <SpecHeader name={cohort.name} status={<Badge>live</Badge>} description={cohort.description} facts={spec.facts} />
        <SpecNav items={[{ id: 'standings', label: 'Standings' }, ...CANONICAL_NAV, { id: 'get-started', label: 'Get started' }]} />

        <SpecSection id="standings" title={`Standings${lastDate ? ` · through ${lastDate}` : ''}`}>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              {/* Two header rows: every metric sits under the track it was measured on. The live and
                  backtest numbers cover different windows and must never read as one series. */}
              <thead className="bg-secondary/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 pt-2" colSpan={2} />
                  <th className="text-center px-3 pt-2 border-l border-border" colSpan={5}>Live · forward-only</th>
                  <th className="text-center px-3 pt-2 border-l border-border" colSpan={3}>Backtest · 252d</th>
                </tr>
                <tr>
                  <th className="text-left px-3 pb-2">#</th><th className="text-left px-3 pb-2">Model</th>
                  <th className="text-right px-3 pb-2 border-l border-border">Sharpe</th><th className="text-right px-3 pb-2">Days</th>
                  <th className="text-right px-3 pb-2">Hit</th><th className="text-right px-3 pb-2">PnL</th>
                  <th className="text-right px-3 pb-2" title="Probability the edge is real once the whole field's worth of attempts is accounted for">Real?</th>
                  <th className="text-right px-3 pb-2 border-l border-border">Sharpe</th><th className="text-right px-3 pb-2">Hit</th>
                  <th className="text-right px-3 pb-2">PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => {
                  const liveSharpe = r.s?.live_sharpe
                  const liveDays = r.s?.live_days ?? 0
                  // Below the threshold the live Sharpe is shown but greyed: it isn't ranked on, and at
                  // this sample size it is not distinguishable from zero.
                  const provisional = !liveQualified(r.s)
                  const signed = (v: number | null | undefined) =>
                    v == null ? 'text-muted-foreground' : v >= 0 ? 'text-emerald-600' : 'text-red-500'
                  const pct = (v: number | null | undefined, d = 0) => v == null ? '—' : `${(v * 100).toFixed(d)}%`
                  const band = confidenceBand(r.s?.live_deflated_sharpe, r.s?.live_days)
                  return (
                  <tr key={r.id} className={r.mine ? 'bg-[#C9A34E]/5' : ''}>
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">
                      <Link href={`/compete/sp500-nextday/model/${r.id}`} className="font-medium text-foreground hover:text-[#C9A34E] hover:underline underline-offset-4">{r.name}</Link>{' '}
                      <span className="text-xs text-muted-foreground">{r.author}</span>
                      {r.error && (
                        <span className="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-600 align-middle"
                              title={r.error}>not scoring</span>
                      )}
                    </td>
                    {/* Net is the ranked figure; gross sits under it so the cost of trading is
                        legible at a glance — the gap between them is what turnover costs. */}
                    <td className={`px-3 py-2 text-right font-mono font-semibold border-l border-border ${provisional ? 'text-muted-foreground' : signed(liveSharpe)}`}
                        title={provisional ? `Provisional — ${liveDays}/${LIVE_MIN_DAYS} sessions; not ranked on yet` : undefined}>
                      {liveSharpe == null ? '—' : liveSharpe.toFixed(2)}{provisional && liveSharpe != null ? '*' : ''}
                      {r.s?.live_gross_sharpe != null && (
                        <span className="block text-[10px] font-normal text-muted-foreground" title="Before turnover costs">
                          {r.s.live_gross_sharpe.toFixed(2)} gross
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{liveDays}</td>
                    <td className="px-3 py-2 text-right font-mono">{pct(r.s?.live_hit_rate)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${signed(r.s?.live_cum_return)}`}>{pct(r.s?.live_cum_return, 1)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap" title={`${band.hint}${r.s?.live_deflated_sharpe != null ? ` (deflated Sharpe ${r.s.live_deflated_sharpe.toFixed(2)})` : ''}`}>
                      <span className={`text-xs font-medium ${
                        band.tone === 'good' ? 'text-emerald-600' : band.tone === 'ok' ? 'text-amber-600'
                        : band.tone === 'weak' ? 'text-muted-foreground' : band.tone === 'bad' ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {band.label}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-right font-mono border-l border-border ${signed(r.s?.sharpe)}`}>
                      {r.s?.sharpe != null ? r.s.sharpe.toFixed(2) : '—'}
                      {r.s?.gross_sharpe != null && (
                        <span className="block text-[10px] text-muted-foreground" title="Before turnover costs">
                          {r.s.gross_sharpe.toFixed(2)} gross
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{pct(r.s?.hit_rate)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${signed(r.s?.cum_return)}`}>{pct(r.s?.cum_return, 1)}</td>
                  </tr>
                  )
                })}
                {rows.length === 0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">No models yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="text-foreground">Live</span> = forward-only track since each model went active (the honest score; it grows daily).{' '}
            <span className="text-foreground">Backtest</span> = a rolling 252-day walk-forward over real prices, recomputed daily — a baseline that’s comparable from day one.{' '}
            The two groups cover different windows, so read across a group, never across the divider.{' '}
            Sharpe is net of a 2bp round-trip cost charged on every position change, with the pre-cost
            figure beneath it — the gap is what turnover costs, and ranking is on the net number.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-mono">*</span> Provisional: fewer than {LIVE_MIN_DAYS} live sessions, so the model is ranked on its
            backtest for now. An annualised Sharpe from <span className="font-mono">n</span> days carries a standard error of about{' '}
            <span className="font-mono">√(252/n)</span>
            {worstSe != null && shortestLive > 0
              ? <> — at {shortestLive} session{shortestLive === 1 ? '' : 's'} that’s ±{worstSe.toFixed(1)}, wide enough that most of
                  this board is indistinguishable from zero</>
              : null}. The confidence column stays quiet until a model clears {LIVE_MIN_DAYS} sessions, since a verdict drawn
            from the same short record would only restate the sample size.
          </p>
          {curves.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium mb-1">Live curves · vol-scaled to {(TARGET_VOL * 100).toFixed(0)}%</h3>
              <Sp500LiveCurves dates={chartDates} curves={curves} targetVol={TARGET_VOL} />
            </div>
          )}
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
    const arenaUrl = arenaConnectUrl(cohort)
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
