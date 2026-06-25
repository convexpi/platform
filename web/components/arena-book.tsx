'use client'

import { useEffect, useRef, useState } from 'react'

// Live order-book viewer. Connects to an Arena server as an *observer* and renders the depth
// ladder, spread, recent-trades tape, and a maker/taker leaderboard from the broadcast.

type Level = [number, number]   // [price_cents, size_units]

interface MarketMsg {
  tick: number
  best_bid: number | null
  best_ask: number | null
  last_price: number | null
  mid: number | null
  depth: { bids: Level[]; asks: Level[] }
  recent_trades: { price: number; qty: number; aggressor: string }[]
  volume: number
  leaderboard: {
    agent_id: string; pnl: number; position: number
    maker_volume?: number; taker_volume?: number; maker_pct?: number | null; fees?: number
  }[]
}

const usd = (cents: number | null | undefined) =>
  cents == null ? '—' : (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function ArenaBook({ url, levels = 8 }: { url: string; levels?: number }) {
  const [m, setM] = useState<MarketMsg | null>(null)
  const [status, setStatus] = useState<'connecting' | 'live' | 'closed'>('connecting')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let stop = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus('connecting')
    const ws = new WebSocket(url)
    wsRef.current = ws
    ws.onopen = () => ws.send(JSON.stringify({ type: 'observe' }))
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'welcome') setStatus('live')
        else if (msg.type === 'market') setM(msg as MarketMsg)
      } catch { /* ignore */ }
    }
    ws.onerror = () => !stop && setStatus('closed')
    ws.onclose = () => !stop && setStatus('closed')
    return () => { stop = true; ws.close() }
  }, [url])

  const asks = (m?.depth.asks ?? []).slice(0, levels)
  const bids = (m?.depth.bids ?? []).slice(0, levels)
  const maxSize = Math.max(1, ...asks.map(l => l[1]), ...bids.map(l => l[1]))
  const spread = m?.best_bid != null && m?.best_ask != null ? m.best_ask - m.best_bid : null

  const dot = status === 'live' ? 'bg-emerald-500' : status === 'connecting' ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/40">
        <div className="flex items-center gap-2 text-sm">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <span className="font-medium text-foreground">Live order book</span>
          {m && <span className="text-xs text-muted-foreground">tick {m.tick}</span>}
        </div>
        <div className="text-xs font-mono text-muted-foreground">
          {m ? <>mid <span className="text-foreground">{usd(m.mid)}</span> · last {usd(m.last_price)}</> : status}
        </div>
      </div>

      {!m ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          {status === 'closed' ? 'Disconnected — is an Arena server running at this URL?' : 'Waiting for the first tick…'}
        </div>
      ) : (
        <div className="grid md:grid-cols-[1.2fr_1fr]">
          {/* Depth ladder */}
          <div className="p-3 border-b md:border-b-0 md:border-r border-border">
            <Ladder levels={asks} side="ask" maxSize={maxSize} reverse />
            <div className="flex items-center justify-center gap-2 py-1.5 my-1 text-xs font-mono text-muted-foreground border-y border-dashed border-border">
              spread <span className="text-foreground">{spread == null ? '—' : usd(spread)}</span>
            </div>
            <Ladder levels={bids} side="bid" maxSize={maxSize} />
          </div>

          {/* Tape + leaderboard */}
          <div className="p-3 space-y-4">
            <div>
              <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-1">Recent trades</p>
              <div className="font-mono text-xs space-y-0.5 min-h-[3rem]">
                {m.recent_trades.length === 0 && <p className="text-muted-foreground/60">— no prints this tick —</p>}
                {m.recent_trades.slice(0, 6).map((t, i) => (
                  <div key={i} className="flex justify-between">
                    <span className={t.aggressor === 'buy' ? 'text-emerald-600' : 'text-red-500'}>
                      {t.aggressor === 'buy' ? '▲' : '▼'} {usd(t.price)}
                    </span>
                    <span className="text-muted-foreground">{t.qty}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-1">Leaderboard · maker/taker</p>
              <div className="space-y-1">
                {m.leaderboard.slice(0, 6).map(r => (
                  <div key={r.agent_id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-foreground max-w-[40%]">{r.agent_id}</span>
                    <span className={`font-mono ${r.pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {r.pnl >= 0 ? '+' : ''}{r.pnl.toFixed(0)}
                    </span>
                    <MakerBar pct={r.maker_pct ?? null} />
                  </div>
                ))}
                {m.leaderboard.length === 0 && <p className="text-xs text-muted-foreground/60">— no participants yet —</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Ladder({ levels, side, maxSize, reverse = false }:
  { levels: Level[]; side: 'bid' | 'ask'; maxSize: number; reverse?: boolean }) {
  const rows = reverse ? [...levels].reverse() : levels
  const color = side === 'ask' ? 'text-red-500' : 'text-emerald-600'
  const bar = side === 'ask' ? 'bg-red-500/10' : 'bg-emerald-500/10'
  return (
    <div className="font-mono text-xs">
      {rows.map(([px, sz], i) => (
        <div key={i} className="relative flex justify-between px-2 py-0.5">
          <div className={`absolute inset-y-0 right-0 ${bar}`} style={{ width: `${(sz / maxSize) * 100}%` }} />
          <span className={`relative ${color}`}>{usd(px)}</span>
          <span className="relative text-muted-foreground">{sz}</span>
        </div>
      ))}
      {rows.length === 0 && <div className="px-2 py-0.5 text-muted-foreground/50">—</div>}
    </div>
  )
}

function MakerBar({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-[10px] text-muted-foreground/50 w-20 text-right">no fills</span>
  return (
    <span className="flex items-center gap-1 w-20" title={`${pct}% maker / ${(100 - pct).toFixed(0)}% taker`}>
      <span className="flex-1 h-1.5 rounded-full bg-red-500/30 overflow-hidden">
        <span className="block h-full bg-emerald-500/70" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">{pct.toFixed(0)}%</span>
    </span>
  )
}
