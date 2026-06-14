import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL ?? ''

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

async function postDiscord(payload: object) {
  if (!DISCORD_WEBHOOK) return
  try {
    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {}
}

// PATCH /api/seasons/[id] — end a season
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await makeClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load the session to verify ownership
  const { data: session } = await supabase
    .from('arena_sessions')
    .select('id, cohort_id, season_name, status')
    .eq('id', id)
    .single()

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.status === 'ended') {
    return NextResponse.json({ error: 'Season already ended' }, { status: 409 })
  }

  const { data: membership } = await supabase
    .from('cohort_members')
    .select('role')
    .eq('cohort_id', session.cohort_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: updated, error } = await supabase
    .from('arena_sessions')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch top 3 for the Discord notification
  const { data: top } = await supabase
    .from('arena_rankings')
    .select('agent_id, pnl_cents, position')
    .eq('session_id', id)
    .order('pnl_cents', { ascending: false })
    .limit(3)

  const podium = (top ?? [])
    .map((r, i) => `${['🥇', '🥈', '🥉'][i]} ${r.agent_id} — $${(r.pnl_cents / 100).toFixed(2)}`)
    .join('\n') || '_No rankings recorded_'

  await postDiscord({
    embeds: [{
      title: `🏁 Season Ended: ${session.season_name}`,
      color: 0x5865f2,
      description: `**Final podium:**\n${podium}`,
      footer: { text: 'ConvexPi Arena' },
      timestamp: new Date().toISOString(),
    }],
  })

  return NextResponse.json({ session: updated })
}
