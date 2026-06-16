'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function JoinForm({ slug }: { slug: string }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push(`/login?next=/classroom/${slug}/join`); return }

      const { data: cohort } = await supabase
        .from('cohorts')
        .select('id, join_code, slug')
        .eq('slug', slug)
        .eq('type', 'classroom')
        .single()

      if (!cohort) { setError('Classroom not found.'); return }
      if (cohort.join_code?.toUpperCase() !== code.trim().toUpperCase()) {
        setError('Incorrect join code. Please check with your instructor.')
        return
      }

      const { error: insertError } = await supabase
        .from('cohort_members')
        .insert({ cohort_id: cohort.id, user_id: user.id, role: 'student' })

      if (insertError && !insertError.message.includes('duplicate')) {
        setError(insertError.message)
        return
      }

      router.push(`/classroom/${cohort.slug}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="code">Join code</Label>
        <Input
          id="code"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={12}
          className="mt-1 font-mono text-center text-lg tracking-widest uppercase"
          autoFocus
          required
        />
      </div>
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}
      <Button type="submit" disabled={!code.trim() || isPending} className="w-full">
        {isPending ? 'Joining…' : 'Join classroom'}
      </Button>
    </form>
  )
}
