import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TutorPageClient from './tutor-client'
import type { SubmissionContext } from './tutor-client'

export const dynamic = 'force-dynamic'

export default async function TutorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, strategy_name, submitted_at, grade_reports(is_sharpe, oos_sharpe, overfitting_ratio, alphas_discovered, total_alphas), cohorts(name, slug)')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('submitted_at', { ascending: false })
    .limit(10)

  type Row = {
    id: string
    strategy_name: string
    submitted_at: string
    grade_reports: SubmissionContext['grade'][] | null
    cohorts: { name: string; slug: string } | null
  }

  const graded: SubmissionContext[] = ((submissions ?? []) as unknown as Row[])
    .map(s => {
      const r = Array.isArray(s.grade_reports) ? s.grade_reports[0] : s.grade_reports
      return { id: s.id, strategy_name: s.strategy_name, submitted_at: s.submitted_at, cohort_name: s.cohorts?.name ?? '', grade: r ?? null }
    })
    .filter(s => s.grade != null)

  return <TutorPageClient initialSubmissions={graded} />
}
