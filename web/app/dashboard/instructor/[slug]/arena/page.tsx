'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArenaBook } from '@/components/arena-book'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArenaState {
  connected: boolean
  tick: number
  agents: number
  observers: number
  lastMessage: string
}

interface LogEntry {
  time: string
  text: string
  type: 'info' | 'warn' | 'error' | 'action'
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ArenaManagementPage({
  params,
}: {
  params: { slug: string }
}) {
  const [arenaUrl, setArenaUrl]   = useState(process.env.NEXT_PUBLIC_ARENA_URL || 'ws://localhost:8765')
  const [adminToken, setAdminToken] = useState('')
  const [state, setState]         = useState<ArenaState>({
    connected: false, tick: 0, agents: 0, observers: 0, lastMessage: '',
  })
  const [log, setLog]             = useState<LogEntry[]>([])
  const [volMultiplier, setVolMultiplier] = useState('3')
  const wsRef = useRef<WebSocket | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  function addLog(text: string, type: LogEntry['type'] = 'info') {
    const entry: LogEntry = {
      time: new Date().toLocaleTimeString(),
      text,
      type,
    }
    setLog(prev => [...prev.slice(-199), entry])
  }

  function connect() {
    if (wsRef.current) {
      wsRef.current.close()
    }
    addLog(`Connecting to ${arenaUrl} as admin…`, 'info')
    const ws = new WebSocket(arenaUrl)
    wsRef.current = ws

    ws.onopen = () => {
      addLog('WebSocket open — registering as admin', 'info')
      ws.send(JSON.stringify({ type: 'admin', token: adminToken }))
    }

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.type === 'welcome' && msg.mode === 'admin') {
          setState(s => ({ ...s, connected: true }))
          addLog('✓ Admin session established', 'info')
        } else if (msg.type === 'tick') {
          setState(s => ({
            ...s,
            tick: msg.tick,
            agents: msg.agents ?? s.agents,
            observers: msg.observers ?? s.observers,
            lastMessage: evt.data.slice(0, 120),
          }))
        } else if (msg.type === 'scenario_applied') {
          addLog(`Scenario applied: ${msg.description}`, 'action')
        } else if (msg.type === 'error') {
          addLog(`Server error: ${msg.message}`, 'error')
        }
      } catch {
        addLog(`Raw: ${evt.data.slice(0, 120)}`, 'info')
      }
    }

    ws.onerror = () => {
      addLog('WebSocket error — check Arena URL and token', 'error')
    }

    ws.onclose = (evt) => {
      setState(s => ({ ...s, connected: false }))
      addLog(`Disconnected (code ${evt.code})`, 'warn')
      wsRef.current = null
    }
  }

  function disconnect() {
    wsRef.current?.close()
  }

  function sendScenario(action: string, kwargs: Record<string, unknown>) {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog('Not connected — cannot send command', 'error')
      return
    }
    const payload = { action, kwargs }
    wsRef.current.send(JSON.stringify(payload))
    addLog(`→ ${action} ${JSON.stringify(kwargs)}`, 'action')
  }

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  // Cleanup on unmount
  useEffect(() => () => wsRef.current?.close(), [])

  const logColors: Record<LogEntry['type'], string> = {
    info:   'text-muted-foreground',
    warn:   'text-yellow-500',
    error:  'text-red-500',
    action: 'text-blue-500',
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span>/</span>
        <Link href={`/dashboard/instructor/${params.slug}`} className="hover:text-foreground">
          Instructor
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Arena</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Arena session management</h1>
        <Badge variant={state.connected ? 'default' : 'outline'}>
          {state.connected ? '● Live' : '○ Disconnected'}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="arena-url" className="text-xs">Arena WebSocket URL</Label>
              <Input
                id="arena-url"
                value={arenaUrl}
                onChange={e => setArenaUrl(e.target.value)}
                placeholder="ws://localhost:8765"
                className="mt-1 font-mono text-sm"
                disabled={state.connected}
              />
            </div>
            <div>
              <Label htmlFor="admin-token" className="text-xs">Admin token (ARENA_ADMIN_TOKEN)</Label>
              <Input
                id="admin-token"
                type="password"
                value={adminToken}
                onChange={e => setAdminToken(e.target.value)}
                placeholder="leave blank if not set"
                className="mt-1 font-mono text-sm"
                disabled={state.connected}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={connect} disabled={state.connected} size="sm" className="flex-1">
                Connect
              </Button>
              <Button onClick={disconnect} disabled={!state.connected} variant="outline" size="sm" className="flex-1">
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Live stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live state</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Tick',      value: state.tick },
                { label: 'Agents',    value: state.agents },
                { label: 'Observers', value: state.observers },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live order book (independent observer connection) */}
      <div className="mb-6">
        <ArenaBook url={arenaUrl} />
      </div>

      {/* Scenario controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Scenario triggers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label htmlFor="vol-mult" className="text-xs">Vol shock multiplier</Label>
              <Input
                id="vol-mult"
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={volMultiplier}
                onChange={e => setVolMultiplier(e.target.value)}
                className="mt-1 w-24"
                disabled={!state.connected}
              />
            </div>
            <Button
              onClick={() => sendScenario('vol_shock', { multiplier: parseFloat(volMultiplier) || 3 })}
              disabled={!state.connected}
              variant="destructive"
              size="sm"
            >
              Trigger vol shock
            </Button>
            <Button
              onClick={() => sendScenario('vol_shock', { multiplier: 1 })}
              disabled={!state.connected}
              variant="outline"
              size="sm"
            >
              Reset volatility
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Vol shock multiplies the market&apos;s fundamental volatility by the given factor for one or more ticks — use to test student risk management.
          </p>
        </CardContent>
      </Card>

      {/* Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Event log</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setLog([])}>Clear</Button>
        </CardHeader>
        <CardContent>
          <div className="h-64 overflow-y-auto font-mono text-xs bg-muted rounded p-3 space-y-0.5">
            {log.length === 0 && (
              <p className="text-muted-foreground">Connect to the Arena to see events.</p>
            )}
            {log.map((entry, i) => (
              <div key={i} className={logColors[entry.type]}>
                <span className="text-muted-foreground mr-2">{entry.time}</span>
                {entry.text}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
