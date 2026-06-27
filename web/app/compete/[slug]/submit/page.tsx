import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SubmitForm } from '@/components/submit-form'
import { STARTERS, competitionKind } from '@/lib/starters'
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

  const starter = STARTERS[competitionKind(cohort)]

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Submit strategy</h1>
        <p className="text-muted-foreground">{cohort.name}</p>
      </div>

      {/* Starter notebook — how to actually fit a model for this competition */}
      <div className="mb-8 rounded-xl border border-[#C9A34E]/40 bg-[#C9A34E]/5 px-5 py-4 flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-foreground">New here? Start with the Colab notebook</p>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-xl">{starter.blurb} It produces a <code className="bg-muted px-1 rounded text-xs">MyStrategy</code> class you paste below.</p>
        </div>
        <a href={starter.url} target="_blank" rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center rounded-md bg-[#C9A34E] text-[#0B1F3A] text-sm font-medium px-3 py-1.5 hover:bg-[#b8922d]">
          Open starter ↗
        </a>
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
