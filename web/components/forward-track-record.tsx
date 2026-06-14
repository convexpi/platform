'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'

interface ForwardScore {
  run_date: string
  forward_sharpe: number | null
  forward_return: number | null
  forward_max_dd: number | null
}

interface Props {
  submissionId: string
}

export function ForwardTrackRecord({ submissionId }: Props) {
  const [scores, setScores] = useState<ForwardScore[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('forward_scores')
      .select('run_date, forward_sharpe, forward_return, forward_max_dd')
      .eq('submission_id', submissionId)
      .order('run_date', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setScores((data ?? []) as ForwardScore[])
        setLoading(false)
      })
  }, [submissionId])

  if (loading) return null
  if (scores.length === 0) return (
    <p className="text-xs text-muted-foreground mt-2">
      Forward track record: not yet evaluated (runs nightly).
    </p>
  )

  const latest = scores[0]
  const sharpe = latest.forward_sharpe

  const trend = scores.length >= 5
    ? (scores.slice(0, 5).filter(s => (s.forward_sharpe ?? 0) > 0).length >= 3 ? 'positive' : 'negative')
    : null

  return (
    <div className="mt-3 pt-3 border-t">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Forward track record
        </p>
        <Badge variant="outline" className="text-xs">
          {scores.length} day{scores.length !== 1 ? 's' : ''}
        </Badge>
        {trend && (
          <Badge variant={trend === 'positive' ? 'default' : 'destructive'} className="text-xs">
            {trend === 'positive' ? '↑ consistent' : '↓ inconsistent'}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Latest Sharpe</p>
          <p className={`font-mono font-semibold ${sharpe != null && sharpe > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {sharpe != null ? sharpe.toFixed(3) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Latest return</p>
          <p className="font-mono font-semibold">
            {latest.forward_return != null ? `${(latest.forward_return * 100).toFixed(1)}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Latest max DD</p>
          <p className="font-mono font-semibold">
            {latest.forward_max_dd != null ? `${latest.forward_max_dd.toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      {/* Sparkline: bar per day, colored by sign */}
      <div className="flex items-end gap-0.5 mt-2 h-8">
        {[...scores].reverse().map(s => {
          const v = s.forward_sharpe ?? 0
          const h = Math.min(100, Math.abs(v) * 25)
          return (
            <div
              key={s.run_date}
              title={`${s.run_date}: ${v.toFixed(3)}`}
              className={`flex-1 rounded-sm ${v >= 0 ? 'bg-green-500' : 'bg-red-400'}`}
              style={{ height: `${Math.max(8, h)}%` }}
            />
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Last evaluated: {new Date(latest.run_date).toLocaleDateString()}
      </p>
    </div>
  )
}
