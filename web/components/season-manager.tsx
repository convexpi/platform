'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ArenaSession {
  id: string
  season_name: string
  description: string | null
  status: string
  started_at: string
  ended_at: string | null
}

interface Props {
  cohortId: string
  initialSessions: ArenaSession[]
}

export function SeasonManager({ cohortId, initialSessions }: Props) {
  const [sessions, setSessions] = useState<ArenaSession[]>(initialSessions)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [ending, setEnding] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function createSeason() {
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    const res = await fetch('/api/seasons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cohortId, seasonName: name, description }),
    })
    const body = await res.json()
    if (!res.ok) {
      setError(body.error ?? 'Failed to create season')
    } else {
      setSessions(prev => [body.session, ...prev])
      setName('')
      setDescription('')
    }
    setCreating(false)
  }

  async function endSeason(id: string) {
    setEnding(id)
    setError(null)
    const res = await fetch(`/api/seasons/${id}`, { method: 'PATCH' })
    const body = await res.json()
    if (!res.ok) {
      setError(body.error ?? 'Failed to end season')
    } else {
      setSessions(prev => prev.map(s => s.id === id ? body.session : s))
    }
    setEnding(null)
  }

  const active  = sessions.filter(s => s.status === 'active')
  const ended   = sessions.filter(s => s.status === 'ended')

  return (
    <div className="space-y-6">

      {/* Create season form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">New season</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="season-name">Season name</Label>
            <Input
              id="season-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Fall 2026 Week 1"
              className="max-w-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="season-desc">Description (optional)</Label>
            <Input
              id="season-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Market-making sprint, 60 ticks"
              className="max-w-xs"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={createSeason} disabled={creating || !name.trim()} size="sm">
            {creating ? 'Creating…' : 'Start season'}
          </Button>
        </CardContent>
      </Card>

      {/* Active seasons */}
      {active.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Active seasons</h3>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Description</th>
                  <th className="text-left px-4 py-2 font-medium">Started</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {active.map(s => (
                  <tr key={s.id} className="border-t">
                    <td className="px-4 py-2 font-medium">
                      {s.season_name}
                      <Badge variant="default" className="ml-2 text-xs">active</Badge>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{s.description ?? '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(s.started_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={ending === s.id}
                        onClick={() => endSeason(s.id)}
                      >
                        {ending === s.id ? 'Ending…' : 'End season'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Season archive */}
      {ended.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Season archive</h3>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Description</th>
                  <th className="text-left px-4 py-2 font-medium">Started</th>
                  <th className="text-left px-4 py-2 font-medium">Ended</th>
                </tr>
              </thead>
              <tbody>
                {ended.map(s => (
                  <tr key={s.id} className="border-t opacity-75">
                    <td className="px-4 py-2 font-medium">
                      {s.season_name}
                      <Badge variant="outline" className="ml-2 text-xs">ended</Badge>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{s.description ?? '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(s.started_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                      {s.ended_at ? new Date(s.ended_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <p className="text-sm text-muted-foreground">No seasons yet. Create one to track a competition run.</p>
      )}
    </div>
  )
}
