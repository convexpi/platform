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

export default async function CompetitionLeaderboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: cohort } = await supabase
    .from('cohorts')
    .select('*')
    .eq('slug', slug)
    .eq('type', 'competition')
    .single()

  if (!cohort) notFound()

  // Arena session (secondary view)
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
          <Link href={`/compete/${slug}`} className="text-muted-foreground hover:text-foreground text-sm">
            ← {cohort.name}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <Badge variant={statusColor[cohort.status as keyof typeof statusColor]}>{cohort.status}</Badge>
        </div>
        {cohort.end_date && (
          <p className="text-sm text-muted-foreground mt-1">
            Ends {new Date(cohort.end_date).toLocaleDateString('en-US', { dateStyle: 'long' })}
          </p>
        )}
        <div className="mt-4 flex gap-3">
          {user ? (
            <Link href={`/compete/${slug}/submit`} className={cn(buttonVariants({ size: 'sm' }))}>
              Submit strategy
            </Link>
          ) : (
            <>
              <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
                Sign up to compete
              </Link>
              <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                Log in
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Anonymous CTA banner */}
      {!user && cohort.status === 'active' && (
        <div className="rounded-lg border bg-muted/30 p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            New here?{' '}
            <Link href="/getting-started" className="underline underline-offset-4 text-foreground">
              Follow the 30-minute guide
            </Link>{' '}
            — run Mission 1, submit a strategy, and appear on this leaderboard.
          </p>
          <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }), 'shrink-0')}>
            Get started free
          </Link>
        </div>
      )}

      {/* Lab strategy leaderboard — primary */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">Strategy rankings</h2>
        <LabLeaderboard cohortId={cohort.id} cohortSlug={slug} cohortType="competition" />
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
