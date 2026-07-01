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
    langs: ['r', 'julia'] as const,
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
    langs: ['r', 'julia'] as const,
  },
  {
    id: 'mission_04_strategy_library',
    label: 'Mission 4',
    title: 'Strategy Library',
    desc: 'Replication, combination, and the factor zoo',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_04_strategy_library/notebook.ipynb',
    langs: ['r', 'julia'] as const,
  },
  {
    id: 'mission_05_real_data',
    label: 'Mission 5',
    title: 'Real Data',
    desc: 'Survivorship bias, stale prices, live equity panels',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_05_real_data/notebook.ipynb',
    langs: ['r', 'julia'] as const,
  },
  {
    id: 'mission_06_advanced_agents',
    label: 'Mission 6',
    title: 'Advanced Agents',
    desc: 'RL execution, market impact, end-to-end strategy',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_06_advanced_agents/notebook.ipynb',
  },
  {
    id: 'mission_07_queue_dynamics',
    label: 'Mission 7',
    title: 'Queue Dynamics (L3) · elective',
    desc: 'Queue position, latency, the cancel race',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_07_queue_dynamics/notebook.ipynb',
  },
  {
    id: 'mission_08_cost_of_trading',
    label: 'Mission 8',
    title: 'The Cost of Trading · elective',
    desc: 'Turnover, transaction costs, break-even, capacity',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_08_cost_of_trading/notebook.ipynb',
    langs: ['r', 'julia'] as const,
  },
  {
    id: 'mission_09_pairs_trading',
    label: 'Mission 9',
    title: 'Pairs Trading · elective',
    desc: 'Cointegration, spread z-score, spurious pairs',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_09_pairs_trading/notebook.ipynb',
    langs: ['r', 'julia'] as const,
  },
]

const colabFor = (base: string, lang: 'python' | 'r' | 'julia') =>
  lang === 'python' ? base
  : base.replace('/notebook.ipynb', lang === 'r' ? '/notebook_r.ipynb' : '/notebook_julia.ipynb')

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
              <div className="shrink-0 flex items-center gap-2 text-xs">
                <a href={colabFor(m.colab, 'python')} target="_blank" rel="noopener noreferrer"
                  className="text-[#3b82f6] hover:text-[#2563eb]">
                  {'langs' in m ? 'Python →' : 'Open →'}
                </a>
                {'langs' in m && (m as { langs: readonly string[] }).langs.includes('r') && (
                  <a href={colabFor(m.colab, 'r')} target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground">R</a>
                )}
                {'langs' in m && (m as { langs: readonly string[] }).langs.includes('julia') && (
                  <a href={colabFor(m.colab, 'julia')} target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground">Julia</a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
