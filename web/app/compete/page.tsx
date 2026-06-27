import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Countdown } from '@/components/countdown'
import { ArenaLiveLeader } from '@/components/arena-live-leader'
import { STARTERS } from '@/lib/starters'
import type { Cohort } from '@/lib/types'

export const dynamic = 'force-dynamic'

const BASELINE = '00000000-0000-0000-0000-000000000001'

// Curated game framing per competition (falls back gracefully for unknown slugs).
type Meta = { kind: 'Lab' | 'Arena' | 'Forecast'; difficulty: string; hook: string; data: string }
const META: Record<string, Meta> = {
  'open-leaderboard': { kind: 'Lab', difficulty: 'Beginner', hook: 'The always-open arena — beat the reference baselines on a hidden market.', data: 'Hidden synthetic cross-section, IS/OOS split.' },
  'demo-fall-2026': { kind: 'Lab', difficulty: 'Beginner', hook: 'A demo competition to learn the submit-and-grade flow end to end.', data: 'Hidden synthetic market.' },
  'season-2026-06': { kind: 'Lab', difficulty: 'Intermediate', hook: 'A monthly season on a fresh hidden market — climb the seasonal board.', data: 'Hidden synthetic market, rolled each season.' },
  'arena-open': { kind: 'Arena', difficulty: 'Intermediate', hook: 'Climb the live PnL ladder against 24/7 background agents.', data: 'Synthetic limit-order book.' },
  'arena-book': { kind: 'Arena', difficulty: 'Advanced', hook: 'Trade a real recorded order book — real depth, real slippage.', data: 'Recorded L2 BTC/USD depth replay.' },
  'arena-l3': { kind: 'Arena', difficulty: 'Advanced', hook: 'Real FIFO queue: your limit orders fill only when they reach the front.', data: 'Order-by-order Bitstamp L3 feed.' },
  'sp500-nextday': { kind: 'Forecast', difficulty: 'Intermediate', hook: "Predict tomorrow's S&P 500 move; scored live on real prices.", data: 'Live Yahoo ^GSPC closes.' },
}
function metaFor(c: Cohort): Meta {
  if (META[c.slug]) return META[c.slug]
  const isArena = Object.keys((c.arena_config ?? {}) as Record<string, unknown>).length > 0
  return { kind: isArena ? 'Arena' : 'Lab', difficulty: 'Intermediate', hook: c.description ?? '', data: '' }
}

const DIFF_STYLE: Record<string, string> = {
  Beginner: 'text-emerald-700 border-emerald-200',
  Intermediate: 'text-amber-700 border-amber-200',
  Advanced: 'text-red-600 border-red-200',
}

interface Live { leaderName?: string; leaderMetric?: string; players: number; live: boolean; sessionId?: string | null; points?: number[] }

async function enrich(db: ReturnType<typeof createAdminClient>, c: Cohort, kind: string): Promise<Live> {
  try {
    if (kind === 'Forecast') {
      const { data: top } = await db.from('sp500_scores').select('model_id, sharpe').order('sharpe', { ascending: false }).limit(1)
      const { count } = await db.from('sp500_models').select('id', { count: 'exact', head: true })
      let leaderName: string | undefined
      if (top?.[0]) {
        const { data: m } = await db.from('sp500_models').select('name').eq('id', top[0].model_id).single()
        leaderName = m?.name
      }
      return { leaderName, leaderMetric: top?.[0] ? `Sharpe ${Number(top[0].sharpe).toFixed(2)}` : undefined, players: count ?? 0, live: true }
    }
    if (kind === 'Arena') {
      const { data } = await db.from('leaderboard').select('agent_id, username, pnl_dollars, session_id')
        .eq('cohort_id', c.id).neq('agent_id', '__seed__').order('pnl_dollars', { ascending: false })
      const rows = (data ?? []) as { agent_id: string; username: string | null; pnl_dollars: number; session_id: string }[]
      const players = new Set(rows.map(r => r.agent_id)).size
      const top = rows[0]
      const sessionId = top?.session_id ?? null
      const pnl = top ? Math.round(Number(top.pnl_dollars)) : 0
      let points: number[] = []
      if (top && sessionId) {
        const { data: ser } = await db.from('arena_rankings').select('pnl_cents, tick')
          .eq('session_id', sessionId).eq('agent_id', top.agent_id).order('tick', { ascending: false }).limit(24)
        points = (ser ?? []).map(r => Number(r.pnl_cents) / 100).reverse()
      }
      return {
        leaderName: top ? (top.username ?? top.agent_id) : undefined,
        leaderMetric: top ? `${pnl >= 0 ? '+' : '−'}$${Math.abs(pnl).toLocaleString()}` : undefined,
        players, live: true, sessionId, points,
      }
    }
    // Lab
    const { data } = await db.from('submissions')
      .select('user_id, strategy_name, grade_reports(oos_sharpe)').eq('cohort_id', c.id)
    type Row = { user_id: string; strategy_name: string; grade_reports: { oos_sharpe: number } | { oos_sharpe: number }[] | null }
    const rows = (data ?? []) as Row[]
    const graded = rows.map(r => {
      const g = Array.isArray(r.grade_reports) ? r.grade_reports[0] : r.grade_reports
      return { name: r.strategy_name, user: r.user_id, sharpe: g?.oos_sharpe }
    }).filter(r => typeof r.sharpe === 'number') as { name: string; user: string; sharpe: number }[]
    graded.sort((a, b) => b.sharpe - a.sharpe)
    const players = new Set(rows.map(r => r.user_id).filter(u => u !== BASELINE)).size
    const top = graded[0]
    return { leaderName: top?.name, leaderMetric: top ? `OOS ${top.sharpe.toFixed(2)}` : undefined, players, live: false }
  } catch {
    return { players: 0, live: kind !== 'Lab' }
  }
}

// Next US equity close (16:00 ET ≈ 20:00 UTC during EDT), used for the hero countdown.
function nextUsClose(): string {
  const t = new Date()
  t.setUTCHours(20, 0, 0, 0)
  while (t <= new Date() || t.getUTCDay() === 0 || t.getUTCDay() === 6) t.setUTCDate(t.getUTCDate() + 1)
  return t.toISOString()
}

export default async function CompetePage() {
  const db = createAdminClient()
  const { data: competitions } = await db.from('cohorts').select('*')
    .eq('type', 'competition').eq('visibility', 'public')
    .order('status', { ascending: true }).order('created_at', { ascending: false })

  const all = (competitions ?? []) as Cohort[]
  const live = await Promise.all(all.map(async c => {
    const m = metaFor(c); return { c, m, l: await enrich(db, c, m.kind) }
  }))
  const byStatus = (s: string) => live.filter(x => x.c.status === s)
  const hero = live.find(x => x.c.slug === 'sp500-nextday' && x.c.status === 'active')
  const activeCards = byStatus('active').filter(x => x !== hero)

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Competitions</h1>
          <p className="text-muted-foreground max-w-xl">
            Every competition is graded <strong className="text-foreground font-medium">out of sample</strong> —
            in-sample curve-fitting won&apos;t save you. Submit a strategy, connect an agent, or forecast the market.
          </p>
        </div>
        <Link href="/compete/new"><Button variant="outline" size="sm">Create</Button></Link>
      </div>

      {/* Flagship hero */}
      {hero && (
        <Link href={`/compete/${hero.c.slug}`}
          className="block rounded-2xl border border-[#C9A34E]/40 bg-gradient-to-br from-[#0B1F3A] to-[#13315c] text-white p-7 mb-8 hover:border-[#C9A34E] transition-colors">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#C9A34E] mb-2">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-[#C9A34E] opacity-75 animate-ping" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#C9A34E]" /></span>
            Live · Forecast
          </div>
          <h2 className="font-serif text-3xl mb-2">Predict tomorrow&apos;s S&amp;P 500</h2>
          <p className="text-white/80 max-w-xl mb-4">
            Submit a Python <code className="bg-white/10 px-1 rounded">predict(history)</code> and it&apos;s scored
            walk-forward on real Yahoo prices — folding in a new day after every US close.
          </p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
            <div><span className="text-white/50">Next close in</span> <span className="text-lg"><Countdown target={nextUsClose()} /></span></div>
            {hero.l.leaderName && <div><span className="text-white/50">Leader</span> {hero.l.leaderName} · {hero.l.leaderMetric}</div>}
            <div><span className="text-white/50">Models</span> {hero.l.players}</div>
            <span className={cn(buttonVariants({ size: 'sm' }), 'bg-[#C9A34E] text-[#0B1F3A] hover:bg-[#b8922d]')}>Enter the forecast →</span>
          </div>
        </Link>
      )}

      {/* How competitions work */}
      <div className="grid sm:grid-cols-3 gap-3 mb-10 text-sm">
        {[
          { k: 'Lab', d: 'Submit strategy code; ranked on a hidden out-of-sample market.' },
          { k: 'Arena', d: 'Connect a trading agent to a live limit-order book; ranked by PnL.' },
          { k: 'Forecast', d: 'Submit a predictor; scored live on real market prices.' },
        ].map(x => (
          <div key={x.k} className="rounded-lg border border-border bg-secondary/30 px-4 py-3">
            <p className="font-semibold text-foreground">{x.k}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{x.d}</p>
          </div>
        ))}
      </div>

      {activeCards.length > 0 && <Section title="Active now">{activeCards.map(x => <CompetitionCard key={x.c.id} {...x} />)}</Section>}
      {byStatus('upcoming').length > 0 && <Section title="Coming soon">{byStatus('upcoming').map(x => <CompetitionCard key={x.c.id} {...x} />)}</Section>}
      {byStatus('ended').length > 0 && <Section title="Ended">{byStatus('ended').map(x => <CompetitionCard key={x.c.id} {...x} />)}</Section>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="grid md:grid-cols-2 gap-5">{children}</div>
    </section>
  )
}

function CompetitionCard({ c, m, l }: { c: Cohort; m: Meta; l: Live }) {
  const statusColor = { upcoming: 'secondary', active: 'default', ended: 'outline' } as const
  const entersOnPage = m.kind === 'Arena' || m.kind === 'Forecast'
  const enterHref = entersOnPage ? `/compete/${c.slug}` : `/compete/${c.slug}/submit`
  const enterLabel = m.kind === 'Arena' ? 'Connect agent' : m.kind === 'Forecast' ? 'Submit model' : 'Enter'

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{c.name}</CardTitle>
          <Badge variant={statusColor[c.status]}>{c.status}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs mt-1">
          <span className="font-medium px-1.5 py-0.5 rounded-full bg-secondary text-foreground">{m.kind}</span>
          <span className={cn('px-1.5 py-0.5 rounded-full border', DIFF_STYLE[m.difficulty] ?? 'text-muted-foreground border-border')}>{m.difficulty}</span>
          {l.live && (
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" /></span>
              live
            </span>
          )}
        </div>
        {m.hook && <p className="text-sm text-muted-foreground mt-2 leading-snug">{m.hook}</p>}
        {m.data && <p className="text-xs text-muted-foreground/80 mt-1">Data: {m.data}</p>}

        {/* Living scoreboard line — realtime + sparkline for arenas, static for the rest */}
        {m.kind === 'Arena' ? (
          <ArenaLiveLeader cohortId={c.id} sessionId={l.sessionId ?? null}
            leaderName={l.leaderName} leaderMetric={l.leaderMetric} players={l.players} points={l.points ?? []} />
        ) : (
          <div className="mt-3 rounded-lg bg-secondary/40 px-3 py-2 text-xs">
            {l.leaderName ? (
              <div className="flex items-center justify-between gap-2">
                <span className="truncate"><span className="mr-1">🥇</span><span className="font-medium text-foreground">{l.leaderName}</span> · {l.leaderMetric}</span>
                <span className="text-muted-foreground shrink-0">{l.players > 0 ? `${l.players} players` : 'baselines only'}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">No entries yet — <span className="text-foreground font-medium">be the first →</span></span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <a href={STARTERS[m.kind].url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-[#C9A34E] hover:text-[#b8922d] font-medium">Starter notebook ↗</a>
            {c.end_date && <span className="text-xs text-muted-foreground">{c.status === 'ended' ? 'Ended' : 'Ends'} {new Date(c.end_date).toLocaleDateString()}</span>}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/compete/${c.slug}`}><Button variant="outline" size="sm">View</Button></Link>
            {c.status === 'active' && <Link href={enterHref}><Button size="sm">{enterLabel}</Button></Link>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
