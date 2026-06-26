import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Cohort } from '@/lib/types'

export const dynamic = 'force-dynamic'
export default async function CompetePage() {
  const supabase = await createClient()
  const { data: competitions } = await supabase
    .from('cohorts')
    .select('*')
    .eq('type', 'competition')
    .eq('visibility', 'public')
    .order('status', { ascending: true })   // active first
    .order('created_at', { ascending: false })

  const active  = (competitions ?? []).filter(c => c.status === 'active')
  const upcoming = (competitions ?? []).filter(c => c.status === 'upcoming')
  const ended   = (competitions ?? []).filter(c => c.status === 'ended')

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Competitions</h1>
          <p className="text-muted-foreground">
            Open competitions graded on out-of-sample Sharpe. In-sample curve fitting won&apos;t save you.
          </p>
        </div>
        <Link href="/compete/new">
          <Button variant="outline" size="sm">Create competition</Button>
        </Link>
      </div>

      {active.length > 0 && (
        <Section title="Active now" cohorts={active as Cohort[]} />
      )}
      {upcoming.length > 0 && (
        <Section title="Coming soon" cohorts={upcoming as Cohort[]} />
      )}
      {ended.length > 0 && (
        <Section title="Ended" cohorts={ended as Cohort[]} />
      )}
      {!competitions?.length && (
        <div className="text-center py-24">
          <p className="text-muted-foreground mb-4">No competitions are running yet.</p>
          <p className="text-sm text-muted-foreground mb-6">
            Follow the getting-started guide to see what to expect when one launches.
          </p>
          <Link href="/getting-started" className="underline underline-offset-4 text-sm">
            Getting started →
          </Link>
        </div>
      )}
    </div>
  )
}

function Section({ title, cohorts }: { title: string; cohorts: Cohort[] }) {
  return (
    <section className="mb-12">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {cohorts.map(c => <CompetitionCard key={c.id} cohort={c} />)}
      </div>
    </section>
  )
}

function CompetitionCard({ cohort }: { cohort: Cohort }) {
  const statusColor = { upcoming: 'secondary', active: 'default', ended: 'outline' } as const
  // Arena and the S&P competition are entered on the competition page itself (connect / inline form),
  // not via the Lab code-submit page.
  const isArena = Object.keys((cohort.arena_config ?? {}) as Record<string, unknown>).length > 0
  const entersOnPage = isArena || cohort.slug === 'sp500-nextday'
  const enterHref = entersOnPage ? `/compete/${cohort.slug}` : `/compete/${cohort.slug}/submit`
  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{cohort.name}</CardTitle>
          <Badge variant={statusColor[cohort.status]}>{cohort.status}</Badge>
        </div>
        {cohort.description && (
          <CardDescription className="line-clamp-3">{cohort.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          {cohort.end_date ? (
            <span className="text-xs text-muted-foreground">
              {cohort.status === 'ended' ? 'Ended' : 'Ends'}{' '}
              {new Date(cohort.end_date).toLocaleDateString()}
            </span>
          ) : <span />}
          <div className="flex gap-2">
            <Link href={`/compete/${cohort.slug}`}>
              <Button variant="outline" size="sm">View</Button>
            </Link>
            {cohort.status === 'active' && (
              <Link href={enterHref}>
                <Button size="sm">Enter</Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
