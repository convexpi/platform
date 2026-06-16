import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { JoinForm } from './form'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Join Classroom — ConvexPi' }

export default async function JoinClassroomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/classroom/${slug}/join`)

  const { data: cohort } = await supabase
    .from('cohorts')
    .select('id, name, slug, join_code, visibility')
    .eq('slug', slug)
    .eq('type', 'classroom')
    .single()

  // Already a member — redirect to overview
  if (cohort) {
    const { data: membership } = await supabase
      .from('cohort_members')
      .select('id')
      .eq('cohort_id', cohort.id)
      .eq('user_id', user.id)
      .single()
    if (membership) redirect(`/classroom/${slug}`)
  }

  return (
    <div className="container mx-auto px-4 py-20 max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">
          {cohort ? `Join ${cohort.name}` : 'Join a classroom'}
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter the join code provided by your instructor.
        </p>
      </div>
      <JoinForm slug={slug} />
    </div>
  )
}
