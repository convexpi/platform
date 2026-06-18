'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const MISSIONS = [
  {
    id: 'mission_01_overfitting',
    label: 'Mission 1',
    title: 'The Overfitting Trap',
    desc: 'IS vs OOS Sharpe, grid-search trap',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_01_overfitting/notebook.ipynb',
  },
  {
    id: 'mission_02_marketmaker',
    label: 'Mission 2',
    title: 'The Limit-Order Book',
    desc: 'Inventory risk, adverse selection, PnL attribution',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_02_marketmaker/notebook.ipynb',
  },
  {
    id: 'mission_03_alpha_discovery',
    label: 'Mission 3',
    title: 'Alpha Discovery',
    desc: 'IC analysis, FDR, walk-forward validation',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_03_alpha_discovery/notebook.ipynb',
  },
  {
    id: 'mission_04_strategy_library',
    label: 'Mission 4',
    title: 'Strategy Library',
    desc: 'Replication, combination, and the factor zoo',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_04_strategy_library/notebook.ipynb',
  },
  {
    id: 'mission_05_real_data',
    label: 'Mission 5',
    title: 'Real Data',
    desc: 'Survivorship bias, stale prices, live equity panels',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_05_real_data/notebook.ipynb',
  },
  {
    id: 'mission_06_advanced_agents',
    label: 'Mission 6',
    title: 'Advanced Agents',
    desc: 'RL execution, market impact, end-to-end strategy',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_06_advanced_agents/notebook.ipynb',
  },
]

export function MissionProgress({ initialCompleted }: { initialCompleted: string[] }) {
  const [completed, setCompleted] = useState<string[]>(initialCompleted)
  const [loading, setLoading] = useState<string | null>(null)
  const supabase = createClient()

  async function toggle(missionId: string) {
    setLoading(missionId)
    const isDone = completed.includes(missionId)
    const res = await fetch('/api/missions/complete', {
      method: isDone ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionId }),
    })
    if (res.ok) {
      const data = await res.json()
      setCompleted(data.completed_missions)
      // Refresh session so user_metadata stays in sync
      await supabase.auth.refreshSession()
    }
    setLoading(null)
  }

  const pct = Math.round((completed.length / MISSIONS.length) * 100)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-0.5">Missions</p>
          <p className="text-sm font-semibold text-foreground">{completed.length} / {MISSIONS.length} complete</p>
        </div>
        <Link href="/tutor" className="text-xs text-[#3b82f6] hover:text-[#2563eb]">Ask tutor →</Link>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-border mb-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#3b82f6] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-col gap-2">
        {MISSIONS.map(m => {
          const done = completed.includes(m.id)
          return (
            <div key={m.id} className="flex items-center gap-3">
              <button
                onClick={() => toggle(m.id)}
                disabled={loading === m.id}
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  done
                    ? 'bg-[#14b8a6] border-[#14b8a6]'
                    : 'border-border hover:border-[#3b82f6]'
                }`}
                title={done ? 'Mark incomplete' : 'Mark complete'}
              >
                {done && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {m.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">{m.desc}</p>
              </div>
              <a href={m.colab} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#3b82f6] hover:text-[#2563eb] shrink-0">
                Open →
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
