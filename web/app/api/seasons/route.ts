import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function makeClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )
}

// POST /api/seasons — create a new arena season for a cohort
export async function POST(request: Request) {
  const supabase = await makeClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const { cohortId, seasonName, description } = body ?? {}
  if (!cohortId || !seasonName?.trim()) {
    return NextResponse.json({ error: 'cohortId and seasonName are required' }, { status: 400 })
  }

  // Verify caller is owner/admin of this cohort
  const { data: membership } = await supabase
    .from('cohort_members')
    .select('role')
    .eq('cohort_id', cohortId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: session, error } = await supabase
    .from('arena_sessions')
    .insert({
      cohort_id: cohortId,
      season_name: seasonName.trim(),
      description: description?.trim() ?? null,
      status: 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session }, { status: 201 })
}
