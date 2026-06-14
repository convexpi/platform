import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SubmitForm } from '@/components/submit-form'
import type { Submission } from '@/lib/types'

export const dynamic = 'force-dynamic'
export default async function SubmitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cohort } = await supabase
    .from('cohorts')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!cohort) notFound()

  // Check membership for private cohorts
  if (cohort.visibility === 'private') {
    const { data: membership } = await supabase
      .from('cohort_members')
      .select('role')
      .eq('cohort_id', cohort.id)
      .eq('user_id', user.id)
      .single()
    if (!membership) notFound()
  }

  // My past submissions for this cohort
  const { data: submissions } = await supabase
    .from('submissions')
    .select('*, grade_reports(*)')
    .eq('cohort_id', cohort.id)
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false })
    .limit(10)

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Submit strategy</h1>
        <p className="text-muted-foreground">{cohort.name}</p>
      </div>
      <SubmitForm
        cohortId={cohort.id}
        cohortSlug={slug}
        cohortType={cohort.type}
        pastSubmissions={(submissions ?? []) as Submission[]}
      />
    </div>
  )
}
