import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Leaderboard } from '@/components/leaderboard'
import { LabLeaderboard } from '@/components/lab-leaderboard'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { ArenaRanking } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ClassroomLeaderboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: cohort } = await supabase
    .from('cohorts')
    .select('*')
    .eq('slug', slug)
    .eq('type', 'classroom')
    .single()

  if (!cohort) notFound()

  // Private classrooms require membership
  if (cohort.visibility === 'private') {
    if (!user) notFound()
    const { data: membership } = await supabase
      .from('cohort_members')
      .select('role')
      .eq('cohort_id', cohort.id)
      .eq('user_id', user.id)
      .single()
    if (!membership) notFound()
  }

  const { data: session } = await supabase
    .from('arena_sessions')
    .select('*')
    .eq('cohort_id', cohort.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  const initialRankings: ArenaRanking[] = []
  if (session) {
    const { data } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('session_id', session.id)
      .order('pnl_dollars', { ascending: false })
    if (data) initialRankings.push(...(data as ArenaRanking[]))
  }

  const statusColor = { upcoming: 'secondary', active: 'default', ended: 'outline' } as const

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold">{cohort.name}</h1>
          <Badge variant={statusColor[cohort.status as keyof typeof statusColor]}>{cohort.status}</Badge>
        </div>
        {cohort.description && <p className="text-muted-foreground">{cohort.description}</p>}
        {cohort.end_date && (
          <p className="text-sm text-muted-foreground mt-1">
            Ends {new Date(cohort.end_date).toLocaleDateString('en-US', { dateStyle: 'long' })}
          </p>
        )}
        <div className="mt-4">
          <Link href={`/classroom/${slug}/submit`} className={cn(buttonVariants({ size: 'sm' }))}>
            Submit strategy
          </Link>
        </div>
      </div>

      {/* Lab strategy leaderboard — primary */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">Strategy rankings</h2>
        <LabLeaderboard cohortId={cohort.id} cohortSlug={slug} cohortType="classroom" />
      </section>

      {/* Arena leaderboard — secondary */}
      {session && (
        <section>
          <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Arena rankings</h2>
          <Leaderboard sessionId={session.id} initialRankings={initialRankings} />
        </section>
      )}
    </div>
  )
}
