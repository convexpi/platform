'use client'

import { useState } from 'react'
import TutorChat from '@/components/tutor-chat'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { MissionId } from '@/app/api/tutor/route'

type GradeSnapshot = {
  is_sharpe: number | null
  oos_sharpe: number | null
  overfitting_ratio: number | null
  alphas_discovered: number | null
  total_alphas: number | null
}

export type SubmissionContext = {
  id: string
  strategy_name: string
  submitted_at: string
  cohort_name: string
  grade: GradeSnapshot | null
}

const MISSIONS: { id: MissionId; label: string; description: string }[] = [
  { id: 'mission_01_overfitting',     label: 'Mission 1', description: 'Overfitting game — IS vs OOS Sharpe, grid-search trap' },
  { id: 'mission_02_marketmaker',     label: 'Mission 2', description: 'Market maker — inventory risk, adverse selection, PnL attribution' },
  { id: 'mission_03_alpha_discovery', label: 'Mission 3', description: 'Alpha discovery — IC analysis, FDR, walk-forward validation' },
  { id: 'general',                    label: 'General',   description: 'Platform concepts, grading, Arena and Lab questions' },
]

export default function TutorPageClient({ initialSubmissions }: { initialSubmissions: SubmissionContext[] }) {
  const [missionId, setMissionId] = useState<MissionId>('general')
  const [selectedSubId, setSelectedSubId] = useState<string>(initialSubmissions[0]?.id ?? '')
  const selected = MISSIONS.find(m => m.id === missionId)!
  const activeSub = initialSubmissions.find(s => s.id === selectedSubId) ?? null

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">AI Tutor</h1>
        <p className="text-sm text-muted-foreground">
          Coaches you through the missions. Won&apos;t write your strategy — will help you think better.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Left: chat */}
        <div>
          <Tabs value={missionId} onValueChange={v => setMissionId(v as MissionId)} className="mb-4">
            <TabsList className="w-full">
              {MISSIONS.map(m => (
                <TabsTrigger key={m.id} value={m.id} className="flex-1 text-xs sm:text-sm">
                  {m.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground mb-4">{selected.description}</p>
          <TutorChat key={`${missionId}-${selectedSubId}`} missionId={missionId} submissionId={selectedSubId || undefined} />
        </div>

        {/* Right: submission context panel */}
        <div className="flex flex-col gap-4">
          {initialSubmissions.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-3">
                Submission context
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Select a submission and the tutor will see your grade report.
              </p>
              <div className="flex flex-col gap-1 mb-4">
                <button
                  onClick={() => setSelectedSubId('')}
                  className={`text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                    !selectedSubId ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  No submission selected
                </button>
                {initialSubmissions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSubId(s.id)}
                    className={`text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                      selectedSubId === s.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="font-medium text-foreground block">{s.strategy_name}</span>
                    <span className="text-muted-foreground">{s.cohort_name}</span>
                  </button>
                ))}
              </div>

              {activeSub?.grade && (
                <div className="border-t border-border pt-3 mt-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Grade report</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'IS Sharpe',  val: activeSub.grade.is_sharpe?.toFixed(3) ?? '—' },
                      { label: 'OOS Sharpe', val: activeSub.grade.oos_sharpe?.toFixed(3) ?? '—', highlight: true },
                      { label: 'Overfit ratio', val: activeSub.grade.overfitting_ratio != null ? `${(activeSub.grade.overfitting_ratio * 100).toFixed(0)}%` : '—' },
                      { label: 'Alphas found', val: activeSub.grade.alphas_discovered != null ? `${activeSub.grade.alphas_discovered}/${activeSub.grade.total_alphas}` : '—' },
                    ].map(m => (
                      <div key={m.label}>
                        <p className="text-xs text-muted-foreground">{m.label}</p>
                        <p className={`font-mono text-sm font-semibold ${
                          m.highlight
                            ? (parseFloat(m.val) >= 0 ? 'text-[#14b8a6]' : 'text-red-400')
                            : 'text-foreground'
                        }`}>{m.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {initialSubmissions.length === 0 && (
            <div className="rounded-xl border border-border bg-card/40 p-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">No submissions yet</p>
              <p>Complete a mission and submit a strategy to unlock context-aware coaching.</p>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card/40 p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">How it works</p>
            <p>When you select a submission, the tutor sees your exact grade — IS Sharpe, OOS Sharpe, overfitting ratio — and tailors its coaching to your specific results.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
