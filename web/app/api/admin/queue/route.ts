import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only cohort owners/admins can see queue stats
  const { data: membership } = await supabase
    .from('cohort_members')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .limit(1)

  if (!membership || membership.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Count submissions by status
  const [pending, running, recentCompleted, recentFailed] = await Promise.all([
    supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'running'),
    supabase.from('submissions').select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('submitted_at', new Date(Date.now() - 86_400_000).toISOString()),
    supabase.from('submissions').select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('submitted_at', new Date(Date.now() - 86_400_000).toISOString()),
  ])

  return NextResponse.json({
    pending:          pending.count   ?? 0,
    running:          running.count   ?? 0,
    completed_today:  recentCompleted.count ?? 0,
    failed_today:     recentFailed.count    ?? 0,
    checked_at:       new Date().toISOString(),
  })
}
