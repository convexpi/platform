import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/api-auth'

// Poll a submission's status + grade report. Owner-only (cookie or API key).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const actor = await resolveRequestUser(request)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('submissions')
    .select('id, strategy_name, status, error_message, submitted_at, submitted_via, cohort_id, grade_reports(*)')
    .eq('id', id)
    .eq('user_id', actor.userId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const report = Array.isArray(data.grade_reports) ? data.grade_reports[0] : data.grade_reports
  return NextResponse.json({
    id: data.id,
    strategy_name: data.strategy_name,
    status: data.status,
    error_message: data.error_message,
    submitted_at: data.submitted_at,
    submitted_via: data.submitted_via,
    report: report ?? null,
  })
}

// Delete one of your own submissions (and its grade report). Owner-only (cookie or API key) — handy
// for clearing test submissions off a leaderboard.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const actor = await resolveRequestUser(request)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  // Verify ownership before deleting anything.
  const { data: sub } = await db
    .from('submissions').select('id').eq('id', id).eq('user_id', actor.userId).maybeSingle()
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.from('grade_reports').delete().eq('submission_id', id)
  const { error } = await db.from('submissions').delete().eq('id', id).eq('user_id', actor.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: id })
}
