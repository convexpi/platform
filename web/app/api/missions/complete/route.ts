import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_MISSIONS = [
  'mission_01_overfitting',
  'mission_02_marketmaker',
  'mission_03_alpha_discovery',
  'mission_04_strategy_library',
  'mission_05_real_data',
  'mission_06_advanced_agents',
  'mission_07_queue_dynamics',
  'mission_08_cost_of_trading',
  'mission_09_pairs_trading',
] as const

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { missionId } = await req.json()
  if (!VALID_MISSIONS.includes(missionId)) {
    return NextResponse.json({ error: 'Invalid mission' }, { status: 400 })
  }

  const current = (user.user_metadata?.completed_missions ?? []) as string[]
  if (current.includes(missionId)) {
    return NextResponse.json({ completed_missions: current })
  }

  const updated = [...current, missionId]
  const { error } = await supabase.auth.updateUser({ data: { completed_missions: updated } })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ completed_missions: updated })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { missionId } = await req.json()
  const current = (user.user_metadata?.completed_missions ?? []) as string[]
  const updated = current.filter(m => m !== missionId)

  const { error } = await supabase.auth.updateUser({ data: { completed_missions: updated } })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ completed_missions: updated })
}
