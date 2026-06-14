'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import type { ArenaRanking } from '@/lib/types'

interface LeaderboardProps {
  sessionId: string
  initialRankings: ArenaRanking[]
}

export function Leaderboard({ sessionId, initialRankings }: LeaderboardProps) {
  const [rankings, setRankings] = useState<ArenaRanking[]>(initialRankings)
  const [tick, setTick] = useState(initialRankings[0]?.tick ?? 0)
  const [connected, setConnected] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`arena_rankings:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'arena_rankings',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          // Re-fetch the full leaderboard view on any change
          supabase
            .from('leaderboard')
            .select('*')
            .eq('session_id', sessionId)
            .order('pnl_dollars', { ascending: false })
            .then(({ data }) => {
              if (data) {
                setRankings(data as ArenaRanking[])
                setTick(data[0]?.tick ?? 0)
              }
            })
        }
      )
      .subscribe(status => setConnected(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  const fmt = (n: number) =>
    n >= 0
      ? `+$${n.toFixed(2)}`
      : `-$${Math.abs(n).toFixed(2)}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Tick {tick.toLocaleString()}</span>
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-muted'}`} />
          <span className="text-xs text-muted-foreground">{connected ? 'Live' : 'Connecting…'}</span>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground w-10">#</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Agent</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">PnL</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground hidden sm:table-cell">Position</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground hidden md:table-cell">Survival score</th>
              <th className="px-4 py-2 text-center font-medium text-muted-foreground w-24">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rankings.map((r, i) => (
              <tr
                key={r.agent_id}
                className={`transition-colors ${r.eliminated ? 'opacity-50' : 'hover:bg-muted/30'}`}
              >
                <td className="px-4 py-3 text-muted-foreground font-mono">{i + 1}</td>
                <td className="px-4 py-3 font-medium">
                  {r.username ?? r.agent_id}
                  {r.university && (
                    <span className="ml-2 text-xs text-muted-foreground">{r.university}</span>
                  )}
                </td>
                <td className={`px-4 py-3 text-right font-mono tabular-nums ${
                  r.pnl_dollars >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {fmt(r.pnl_dollars)}
                </td>
                <td className="px-4 py-3 text-right font-mono hidden sm:table-cell">
                  {r.position > 0 ? `+${r.position}` : r.position}
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  {r.survival_score != null ? r.survival_score.toFixed(2) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  {r.eliminated
                    ? <Badge variant="destructive" className="text-xs">Eliminated</Badge>
                    : <Badge variant="outline" className="text-xs text-green-600 border-green-200">Active</Badge>
                  }
                </td>
              </tr>
            ))}
            {rankings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Waiting for agents to connect…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
