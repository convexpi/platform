'use client'

import { useState } from 'react'
import TutorChat from '@/components/tutor-chat'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { MissionId } from '@/app/api/tutor/route'

const MISSIONS: { id: MissionId; label: string; description: string }[] = [
  {
    id: 'mission_01_overfitting',
    label: 'Mission 1',
    description: 'Overfitting game — IS vs OOS Sharpe, grid-search trap',
  },
  {
    id: 'mission_02_marketmaker',
    label: 'Mission 2',
    description: 'Market maker — inventory risk, adverse selection, PnL attribution',
  },
  {
    id: 'mission_03_alpha_discovery',
    label: 'Mission 3',
    description: 'Alpha discovery — IC analysis, FDR, walk-forward validation',
  },
  {
    id: 'general',
    label: 'General',
    description: 'Platform concepts, grading, Arena and Lab questions',
  },
]

export default function TutorPage() {
  const [missionId, setMissionId] = useState<MissionId>('general')
  const selected = MISSIONS.find(m => m.id === missionId)!

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">AI Tutor</h1>
        <p className="text-sm text-muted-foreground">
          Ask questions about your current mission. The tutor coaches — it won&apos;t write your strategy for you.
        </p>
      </div>

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

      <TutorChat key={missionId} missionId={missionId} />
    </div>
  )
}
