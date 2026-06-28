import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { joinByCode } from './actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Join a classroom — ConvexPi' }

export default async function JoinByCodePage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { err } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/classroom/join')

  return (
    <div className="container mx-auto px-4 py-20 max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Join a classroom</h1>
        <p className="text-muted-foreground text-sm">Enter the join code your instructor gave you.</p>
      </div>
      {err && <p className="text-sm text-red-500 text-center mb-4">{err}</p>}
      <form action={joinByCode} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="code">Join code</Label>
          <Input id="code" name="code" placeholder="ABC123" maxLength={12} required autoFocus
            className="mt-1 font-mono text-center text-lg tracking-widest uppercase" />
        </div>
        <Button type="submit" className="w-full">Join classroom</Button>
      </form>
      <p className="text-xs text-muted-foreground text-center mt-6">
        Teaching a course instead? <a href="/teach" className="underline underline-offset-4">Set up a classroom →</a>
      </p>
    </div>
  )
}
