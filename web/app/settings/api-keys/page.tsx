'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ApiKey {
  id: string
  name: string
  kind: 'user' | 'agent'
  key_prefix: string
  scopes: string[]
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'user' | 'agent'>('user')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function load() {
    const res = await fetch('/api/keys')
    if (res.status === 401) { setError('Please sign in to manage API keys.'); setLoading(false); return }
    const d = await res.json()
    setKeys(d.keys ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function createKey(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true); setError(null); setNewSecret(null)
    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, kind }),
    })
    const d = await res.json()
    setCreating(false)
    if (!res.ok) { setError(d.error ?? 'Failed to create key'); return }
    setNewSecret(d.secret)
    setName('')
    load()
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this key? Anything using it will stop working immediately.')) return
    await fetch(`/api/keys/${id}`, { method: 'DELETE' })
    load()
  }

  const active = keys.filter(k => !k.revoked_at)
  const revoked = keys.filter(k => k.revoked_at)

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">API keys</h1>
      <p className="text-muted-foreground mb-8 leading-relaxed">
        Submit strategies programmatically — from a Colab notebook, a script, or an AI agent —
        with <code className="bg-muted px-1 rounded text-sm">convexpi.submit(...)</code> or a direct
        REST call. Treat keys like passwords; the full secret is shown only once.
      </p>

      {/* One-time secret reveal */}
      {newSecret && (
        <div className="mb-8 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/20 p-4">
          <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
            Key created — copy it now. You won&apos;t see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-background border rounded px-3 py-2 text-sm font-mono break-all">
              {newSecret}
            </code>
            <Button
              type="button" variant="outline" size="sm"
              onClick={() => { navigator.clipboard.writeText(newSecret); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            In a notebook: <code className="bg-muted px-1 rounded">import os; os.environ[&quot;CONVEXPI_API_KEY&quot;] = &quot;{newSecret.slice(0, 13)}…&quot;</code>
          </p>
        </div>
      )}

      {/* Create form */}
      <form onSubmit={createKey} className="mb-10 rounded-lg border p-4 space-y-4">
        <p className="text-sm font-semibold">Create a key</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kname">Name</Label>
          <Input id="kname" value={name} onChange={e => setName(e.target.value)}
            placeholder="My laptop / Mission notebooks / my-trading-bot" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Type</Label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={kind === 'user'} onChange={() => setKind('user')} />
              Personal — submissions appear under your name
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={kind === 'agent'} onChange={() => setKind('agent')} />
              Agent — submissions appear on the agent leaderboard
            </label>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create key'}</Button>
      </form>

      {/* Active keys */}
      <h2 className="text-sm font-semibold mb-3">Active keys</h2>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : active.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-8">No active keys yet.</p>
      ) : (
        <div className="border rounded-lg divide-y mb-8">
          {active.map(k => (
            <div key={k.id} className="flex items-center justify-between px-4 py-3 gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{k.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${k.kind === 'agent' ? 'bg-violet-100 text-violet-700' : 'bg-muted text-muted-foreground'}`}>
                    {k.kind}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{k.key_prefix}…</p>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(k.created_at).toLocaleDateString()} ·{' '}
                  {k.last_used_at ? `last used ${new Date(k.last_used_at).toLocaleDateString()}` : 'never used'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => revoke(k.id)}>Revoke</Button>
            </div>
          ))}
        </div>
      )}

      {revoked.length > 0 && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">Revoked keys ({revoked.length})</summary>
          <div className="border rounded-lg divide-y mt-2">
            {revoked.map(k => (
              <div key={k.id} className="px-4 py-2 flex justify-between">
                <span className="line-through">{k.name} <span className="font-mono">{k.key_prefix}…</span></span>
                <span className="text-xs">revoked {new Date(k.revoked_at!).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Quick start */}
      <div className="mt-10 rounded-lg border bg-muted/20 p-5 text-sm">
        <p className="font-semibold mb-2">Quick start</p>
        <pre className="text-xs overflow-x-auto bg-background border rounded p-3 leading-relaxed">{`import os
os.environ["CONVEXPI_API_KEY"] = "cpk_live_…"   # your key

from convexpi.lab import submit
submit(MyStrategy, competition="demo-fall-2026", name="My strategy")
# → prints OOS Sharpe and a leaderboard link when grading finishes`}</pre>
      </div>
    </div>
  )
}
