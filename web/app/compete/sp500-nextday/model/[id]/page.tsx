import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Sp500LiveCurves, type Curve } from '@/components/sp500-live-curves'
import { LIVE_MIN_DAYS, confidenceBand, liveQualified, liveSharpeStdError, type Sp500Score } from '@/lib/sp500-scoring'

export const dynamic = 'force-dynamic'

type Forecast = { as_of: string; forecast: number; realized: number | null; pnl: number | null }

const pct = (v: number | null | undefined, d = 2) => v == null ? '—' : `${(v * 100).toFixed(d)}%`
const num = (v: number | null | undefined, d = 2) => v == null ? '—' : v.toFixed(d)
const signClass = (v: number | null | undefined) =>
  v == null ? 'text-muted-foreground' : v >= 0 ? 'text-emerald-600' : 'text-red-500'

export default async function Sp500ModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // select('*') throughout — several columns arrive with migrations that may not be applied yet,
  // and naming a missing one would fail the whole query.
  const { data: model } = await supabase.from('sp500_models').select('*').eq('id', id).maybeSingle()
  if (!model) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const mine = !!user && model.user_id === user.id

  const [{ data: score }, { data: fcRows }, { data: profile }] = await Promise.all([
    supabase.from('sp500_scores').select('*').eq('model_id', id).maybeSingle(),
    supabase.from('sp500_forecasts').select('as_of, forecast, realized, pnl')
      .eq('model_id', id).order('as_of', { ascending: true }),
    model.user_id
      ? supabase.from('profiles').select('username, display_name').eq('id', model.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const s = (score ?? null) as (Sp500Score & { last_date?: string | null }) | null
  const forecasts = (fcRows ?? []) as Forecast[]
  const realized = forecasts.filter((f) => f.pnl != null)
  const author = model.user_id
    ? (profile?.display_name || (profile?.username ? `@${profile.username}` : 'someone'))
    : 'ConvexPi'
  const lastError = (model as { last_error?: string | null }).last_error ?? null

  // Equity curve from this model's own realized PnL — the same rows the live columns aggregate.
  const dates = realized.map((f) => f.as_of)
  const curves: Curve[] = []
  if (realized.length >= 2) {
    const pnls = realized.map((f) => f.pnl as number)
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length
    const sd = Math.sqrt(pnls.reduce((a, b) => a + (b - mean) ** 2, 0) / pnls.length)
    const scale = sd > 1e-12 ? (0.10 / Math.sqrt(252)) / sd : 1
    let equity = 1
    curves.push({
      id, name: model.name, author, scale,
      points: pnls.map((p) => { equity *= 1 + scale * p; return equity - 1 }),
    })
  }

  const band = confidenceBand(s?.live_deflated_sharpe, s?.live_days)
  const se = liveSharpeStdError(s?.live_days)
  const provisional = !liveQualified(s)

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Link href="/compete/sp500-nextday" className="text-sm text-muted-foreground hover:text-foreground">← S&amp;P next-day</Link>

      <div className="mt-4 mb-8">
        <h1 className="text-2xl font-bold">{model.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {author}
          {s?.last_date ? <> · scored through {s.last_date}</> : null}
          {model.status !== 'active' ? <> · <span className="text-amber-600">{model.status}</span></> : null}
        </p>
      </div>

      {lastError && (
        <div className="mb-8 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
          <p className="text-sm font-medium text-red-600">This model isn&apos;t scoring</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground break-words">{lastError}</p>
          {mine && (
            <p className="mt-2 text-xs text-muted-foreground">
              Fix the code and resubmit on the{' '}
              <Link href="/compete/sp500-nextday#get-started" className="underline underline-offset-4">competition page</Link>.
              Note that editing the code restarts the live track — the new version has no forward record yet.
            </p>
          )}
        </div>
      )}

      {/* Headline: the deflated Sharpe, because "is this real?" is the question that matters. */}
      <section className="mb-8 rounded-xl border border-border p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Live Sharpe · forward-only</p>
            <p className={`font-mono text-3xl font-semibold ${provisional ? 'text-muted-foreground' : signClass(s?.live_sharpe)}`}>
              {num(s?.live_sharpe)}{provisional && s?.live_sharpe != null ? '*' : ''}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              over {s?.live_days ?? 0} session{(s?.live_days ?? 0) === 1 ? '' : 's'}
              {se != null && <> · ±{se.toFixed(1)} standard error</>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Is the edge real?</p>
            <p className={`text-xl font-semibold ${
              band.tone === 'good' ? 'text-emerald-600' : band.tone === 'ok' ? 'text-amber-600'
              : band.tone === 'bad' ? 'text-red-500' : 'text-muted-foreground'}`}>{band.label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {s?.live_deflated_sharpe != null ? `deflated Sharpe ${s.live_deflated_sharpe.toFixed(2)}` : band.hint}
            </p>
          </div>
        </div>
        {provisional && (
          <p className="mt-4 text-xs text-muted-foreground border-t border-border pt-3">
            Provisional: under {LIVE_MIN_DAYS} live sessions, so this model is ranked on its backtest for now.
            An annualised Sharpe from <span className="font-mono">n</span> days carries a standard error near{' '}
            <span className="font-mono">√(252/n)</span> — most short records are indistinguishable from zero.
          </p>
        )}
      </section>

      {curves.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium mb-1">Live equity curve · vol-scaled to 10%</h2>
          <Sp500LiveCurves dates={dates} curves={curves} targetVol={0.10} />
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-sm font-medium mb-3">Metrics</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Panel title="Live · forward-only" rows={[
            ['Sharpe (net of costs)', num(s?.live_sharpe), signClass(s?.live_sharpe)],
            ['Sharpe before costs', num(s?.live_gross_sharpe), signClass(s?.live_gross_sharpe)],
            ['Cumulative PnL', pct(s?.live_cum_return, 1), signClass(s?.live_cum_return)],
            ['Given up to costs', pct(s?.live_cost_drag, 2), s?.live_cost_drag ? 'text-red-500' : ''],
            ['Hit rate', pct(s?.live_hit_rate, 0), ''],
            // Suppressed for models that barely trade: a near-constant excess series makes the
            // ratio about -1/sqrt(n-1) regardless of magnitude, which reads as a real signal.
            ['vs buy & hold (info ratio)',
              (s?.live_turnover ?? 0) < 0.02 ? 'n/a — barely trades' : num(s?.live_info_ratio),
              (s?.live_turnover ?? 0) < 0.02 ? 'text-muted-foreground' : signClass(s?.live_info_ratio)],
            ['Turnover', s?.live_turnover != null ? `${(s.live_turnover * 100).toFixed(0)}% of sessions` : '—', ''],
            ['Sessions', String(s?.live_days ?? 0), ''],
          ]} />
          <Panel title="Backtest · 252-day walk-forward" rows={[
            ['Sharpe (net of costs)', num(s?.sharpe), signClass(s?.sharpe)],
            ['Sharpe before costs', num(s?.gross_sharpe), signClass(s?.gross_sharpe)],
            ['Cumulative PnL', pct(s?.cum_return, 1), signClass(s?.cum_return)],
            ['Given up to costs', pct(s?.cost_drag, 2), s?.cost_drag ? 'text-red-500' : ''],
            ['vs buy & hold', pct(s?.excess_return, 1), signClass(s?.excess_return)],
            ['vs buy & hold (info ratio)',
              (s?.turnover ?? 0) < 0.02 ? 'n/a — barely trades' : num(s?.info_ratio),
              (s?.turnover ?? 0) < 0.02 ? 'text-muted-foreground' : signClass(s?.info_ratio)],
            ['Turnover', s?.turnover != null ? `${(s.turnover * 100).toFixed(0)}% of sessions` : '—', ''],
          ]} />
        </div>
      </section>

      {forecasts.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium mb-3">Forecast history</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs text-muted-foreground sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">Session</th>
                    <th className="text-right px-3 py-2">Forecast</th>
                    <th className="text-right px-3 py-2">Position</th>
                    <th className="text-right px-3 py-2">Actual</th>
                    <th className="text-right px-3 py-2">PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...forecasts].reverse().map((f) => {
                    const pos = f.forecast > 0 ? 'long' : f.forecast < 0 ? 'short' : 'flat'
                    return (
                      <tr key={f.as_of}>
                        <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{f.as_of}</td>
                        <td className={`px-3 py-1.5 text-right font-mono text-xs ${signClass(f.forecast)}`}>{pct(f.forecast, 3)}</td>
                        <td className={`px-3 py-1.5 text-right text-xs font-medium ${
                          pos === 'long' ? 'text-emerald-600' : pos === 'short' ? 'text-red-500' : 'text-muted-foreground'}`}>{pos}</td>
                        <td className={`px-3 py-1.5 text-right font-mono text-xs ${signClass(f.realized)}`}>{pct(f.realized, 2)}</td>
                        <td className={`px-3 py-1.5 text-right font-mono text-xs ${signClass(f.pnl)}`}>{pct(f.pnl, 2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            The most recent row is the call for the next unrealized session — actual and PnL fill in after that close.
            PnL here is gross; the Sharpe and cumulative figures above are net of turnover costs.
          </p>
        </section>
      )}

      {mine && (
        <section>
          <h2 className="text-sm font-medium mb-3">Your code</h2>
          <pre className="rounded-xl border border-border bg-muted/40 p-4 overflow-x-auto text-xs leading-relaxed">{model.code}</pre>
        </section>
      )}
    </div>
  )
}

function Panel({ title, rows }: { title: string; rows: [string, string, string][] }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">{title}</p>
      <dl className="space-y-1.5">
        {rows.map(([k, v, cls]) => (
          <div key={k} className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className={`font-mono text-sm ${cls || 'text-foreground'}`}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
