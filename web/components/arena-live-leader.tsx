'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkline } from './sparkline'

// Live-updating leader line + PnL sparkline for an Arena competition card.
// Subscribes to arena_rankings for the session and refetches the leaderboard
// view on each change (the same realtime source the in-arena board uses).
export function ArenaLiveLeader({ cohortId, sessionId, leaderName, leaderMetric, players, points }: {
  cohortId: string
  sessionId: string | null
  leaderName?: string
  leaderMetric?: string
  players: number
  points: number[]
}) {
  const [st, setSt] = useState({ leaderName, leaderMetric, players })
  const [pts, setPts] = useState<number[]>(points)
  const [live, setLive] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!sessionId) return
    const channel = supabase
      .channel(`compete-leader:${cohortId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'arena_rankings', filter: `session_id=eq.${sessionId}` },
        () => {
          supabase.from('leaderboard')
            .select('agent_id, username, pnl_dollars')
            .eq('cohort_id', cohortId).neq('agent_id', '__seed__')
            .order('pnl_dollars', { ascending: false })
            .then(({ data }) => {
              const rows = (data ?? []) as { agent_id: string; username: string | null; pnl_dollars: number }[]
              const top = rows[0]
              if (!top) return
              const pnl = Math.round(Number(top.pnl_dollars))
              setSt({
                leaderName: top.username ?? top.agent_id,
                leaderMetric: `${pnl >= 0 ? '+' : '−'}$${Math.abs(pnl).toLocaleString()}`,
                players: new Set(rows.map(r => r.agent_id)).size,
              })
              setPts(prev => [...prev, Number(top.pnl_dollars)].slice(-24))
            })
        })
      .subscribe(s => setLive(s === 'SUBSCRIBED'))
    return () => { supabase.removeChannel(channel) }
  }, [sessionId, cohortId])

  return (
    <div className="mt-3 rounded-lg bg-secondary/40 px-3 py-2 text-xs">
      {st.leaderName ? (
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">
            <span className="mr-1">🥇</span>
            <span className="font-medium text-foreground">{st.leaderName}</span> · {st.leaderMetric}
            {live && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" title="live" />}
          </span>
          <span className="flex items-center gap-2 shrink-0">
            <Sparkline points={pts} />
            <span className="text-muted-foreground">{st.players} agents</span>
          </span>
        </div>
      ) : (
        <span className="text-muted-foreground">No agents yet — <span className="text-foreground font-medium">connect one →</span></span>
      )}
    </div>
  )
}
