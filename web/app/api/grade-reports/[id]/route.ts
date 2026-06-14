import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch the grade report joined with its submission and cohort for auth check
  const { data: report, error } = await supabase
    .from('grade_reports')
    .select('*, submissions!inner(user_id, cohort_id, strategy_name, cohorts!inner(visibility))')
    .eq('id', id)
    .single()

  if (error || !report) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // The embedded joins return singular objects for to-one relationships
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submission = report.submissions as any
  const cohortVisibility = submission?.cohorts?.visibility as string | undefined
  const submissionUserId = submission?.user_id as string | undefined

  const isOwner = user != null && user.id === submissionUserId
  const isPublicCohort = cohortVisibility === 'public'

  if (!isOwner && !isPublicCohort) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const strategyName = (submission?.strategy_name as string | undefined) ?? 'strategy'
  const filename = `grade_report_${strategyName.replace(/\s+/g, '_').toLowerCase()}_${id.slice(0, 8)}.json`

  // Strip the nested joins before returning
  const { submissions: _omit, ...reportData } = report as typeof report & { submissions: unknown }
  void _omit

  return new NextResponse(JSON.stringify(reportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
