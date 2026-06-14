'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

export default function NewCompetition() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const slug = slugify(name) + '-' + Math.random().toString(36).slice(2, 6)
    const { data, error: insertError } = await supabase
      .from('cohorts')
      .insert({
        slug,
        name,
        description,
        type: 'competition',
        visibility,
        owner_id: user.id,
        join_code: null,
        start_date: startDate || null,
        end_date: endDate || null,
        status: 'upcoming',
      })
      .select()
      .single()

    if (insertError) { setError(insertError.message); setLoading(false); return }
    router.push(`/compete/${data.slug}/leaderboard`)
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Create competition</CardTitle>
          <CardDescription>
            A public competition ranks participants by out-of-sample Sharpe. Anyone can submit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Competition name</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Demo Competition — Fall 2026"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Open to all. Submit any strategy from the Lab missions."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="start">Start date</Label>
                <Input id="start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="end">End date</Label>
                <Input id="end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Visibility</Label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={visibility === 'public'}
                    onChange={() => setVisibility('public')}
                  />
                  Public — anyone can see and submit
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={visibility === 'private'}
                    onChange={() => setVisibility('private')}
                  />
                  Private — members only
                </label>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create competition'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
