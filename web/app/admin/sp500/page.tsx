import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'S&P models — Admin' }
export const dynamic = 'force-dynamic'

type Model = { id: string; user_id: string | null; name: string; code: string; status: string; created_at: string }
type Score = {
  model_id: string; sharpe: number | null; hit_rate: number | null; cum_return: number | null
  n_days: number | null; last_date: string | null; last_forecast: number | null; last_forecast_as_of: string | null
  live_sharpe: number | null; live_days: number | null; live_cum_return: number | null
}
type Profile = { id: string; username: string | null; display_name: string | null }

function pct(n: number | null | undefined, digits = 1) {
  return n == null ? '—' : `${(n * 100).toFixed(digits)}%`
}

export default async function AdminSp500() {
  const db = createAdminClient()
  const [{ data: models }, { data: scores }] = await Promise.all([
    db.from('sp500_models').select('id, user_id, name, code, status, created_at'),
    db.from('sp500_scores').select('model_id, sharpe, hit_rate, cum_return, n_days, last_date, last_forecast, last_forecast_as_of, live_sharpe, live_days, live_cum_return'),
  ])

  const scoreBy = new Map((scores ?? []).map((s) => [(s as Score).model_id, s as Score]))
  const userIds = [...new Set((models ?? []).map((m) => m.user_id).filter(Boolean))] as string[]
  const { data: profs } = userIds.length
    ? await db.from('profiles').select('id, username, display_name').in('id', userIds)
    : { data: [] as Profile[] }
  const profBy = new Map((profs ?? []).map((p) => [p.id, p as Profile]))

  const rows = ((models ?? []) as Model[])
    .map((m) => ({
      m,
      s: scoreBy.get(m.id) ?? null,
      author: m.user_id ? (profBy.get(m.user_id)?.display_name || (profBy.get(m.user_id)?.username ? `@${profBy.get(m.user_id)!.username}` : m.user_id.slice(0, 8))) : 'House',
    }))
    .sort((a, b) =>
      (b.s?.live_sharpe ?? -Infinity) - (a.s?.live_sharpe ?? -Infinity) || (b.s?.sharpe ?? -Infinity) - (a.s?.sharpe ?? -Infinity))

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">Admin</Link><span>/</span><span>S&amp;P models</span>
      </div>
      <h1 className="text-2xl font-bold mb-1">S&amp;P next-day models</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Every submitted <code className="bg-muted px-1 rounded text-xs">predict(history)</code> with its live next-session call and walk-forward score.
        Forecasts are written by the daily runner — <Link href="/compete/sp500-nextday" className="underline underline-offset-4">public standings</Link>.
      </p>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Model</th>
              <th className="text-left px-3 py-2 font-medium">Author</th>
              <th className="text-left px-3 py-2 font-medium">Next call</th>
              <th className="text-right px-3 py-2 font-medium">Live Sharpe</th>
              <th className="text-right px-3 py-2 font-medium">Live days</th>
              <th className="text-right px-3 py-2 font-medium">Backtest</th>
              <th className="text-right px-3 py-2 font-medium">Hit</th>
              <th className="text-right px-3 py-2 font-medium">Cum PnL</th>
              <th className="text-right px-3 py-2 font-medium">Days</th>
              <th className="text-left px-3 py-2 font-medium">As of</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(({ m, s, author }) => {
              const f = s?.last_forecast
              const dir = f == null ? null : f > 0 ? 'long' : f < 0 ? 'short' : 'flat'
              return (
                <tr key={m.id} className="align-top hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <div className="font-medium">{m.name}</div>
                    {m.status !== 'active' && <span className="text-[10px] text-muted-foreground">{m.status}</span>}
                    <details className="mt-1">
                      <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground">view code</summary>
                      <pre className="mt-1 max-w-[460px] overflow-x-auto rounded bg-muted p-2 text-[11px] leading-snug whitespace-pre-wrap">{m.code}</pre>
                    </details>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{author}</td>
                  <td className="px-3 py-2">
                    {dir == null ? (
                      <span className="text-muted-foreground text-xs">— (awaiting runner)</span>
                    ) : (
                      <span className={`font-medium ${dir === 'long' ? 'text-emerald-600' : dir === 'short' ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {dir === 'long' ? '▲ LONG' : dir === 'short' ? '▼ SHORT' : 'flat'}
                        <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{pct(f, 3)}</span>
                      </span>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono font-semibold ${s?.live_sharpe == null ? 'text-muted-foreground' : s.live_sharpe >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{s?.live_sharpe != null ? s.live_sharpe.toFixed(2) : '—'}</td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{s?.live_days ?? 0}</td>
                  <td className={`px-3 py-2 text-right font-mono ${(s?.sharpe ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{s?.sharpe != null ? s.sharpe.toFixed(2) : '—'}</td>
                  <td className="px-3 py-2 text-right font-mono">{pct(s?.hit_rate, 0)}</td>
                  <td className={`px-3 py-2 text-right font-mono ${(s?.cum_return ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{pct(s?.cum_return, 1)}</td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{s?.n_days ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{s?.last_forecast_as_of ?? s?.last_date ?? '—'}</td>
                </tr>
              )
            })}
            {rows.length === 0 && <tr><td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">No models yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
