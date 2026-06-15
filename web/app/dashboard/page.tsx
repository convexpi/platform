import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MissionProgress } from '@/components/mission-progress'
import type { Cohort } from '@/lib/types'

export const dynamic = 'force-dynamic'
export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const completedMissions: string[] = (user.user_metadata?.completed_missions ?? [])

  const { data: memberships } = await supabase
    .from('cohort_members')
    .select('role, cohorts(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  const cohorts = (memberships ?? []).map(m => ({
    ...(m.cohorts as unknown as Cohort),
    myRole: m.role,
  }))

  const classrooms = cohorts.filter(c => c.type === 'classroom')
  const competitions = cohorts.filter(c => c.type === 'competition')

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/classroom/new"><Button variant="outline" size="sm">+ New classroom</Button></Link>
          <Link href="/compete"><Button size="sm">Browse competitions</Button></Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6 mb-10">
        <div>
          {classrooms.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-medium tracking-widest text-muted-foreground uppercase mb-3">Classrooms</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {classrooms.map(c => <CohortCard key={c.id} cohort={c} />)}
              </div>
            </section>
          )}
          {competitions.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-medium tracking-widest text-muted-foreground uppercase mb-3">Competitions</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {competitions.map(c => <CohortCard key={c.id} cohort={c} />)}
              </div>
            </section>
          )}
          {cohorts.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg mb-4">You haven&apos;t joined any cohorts yet.</p>
              <div className="flex gap-3 justify-center">
                <Link href="/compete"><Button>Browse competitions</Button></Link>
                <Link href="/classroom/new"><Button variant="outline">Create classroom</Button></Link>
              </div>
            </div>
          )}
        </div>
        <div>
          <MissionProgress initialCompleted={completedMissions} />
        </div>
      </div>

    </div>
  )
}

function CohortCard({ cohort }: { cohort: Cohort & { myRole: string } }) {
  const myRole = cohort.myRole
  const base = cohort.type === 'classroom' ? '/classroom' : '/compete'
  const statusColor = { upcoming: 'secondary', active: 'default', ended: 'outline' } as const

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{cohort.name}</CardTitle>
          <div className="flex gap-1 shrink-0">
            <Badge variant={statusColor[cohort.status]} className="text-xs">{cohort.status}</Badge>
            {myRole !== 'member' && <Badge variant="outline" className="text-xs">{myRole}</Badge>}
          </div>
        </div>
        {cohort.description && <CardDescription className="text-xs line-clamp-1">{cohort.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Link href={`${base}/${cohort.slug}/leaderboard`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">Leaderboard</Button>
          </Link>
          {myRole !== 'member' ? (
            <Link href={`/dashboard/instructor/${cohort.slug}`} className="flex-1">
              <Button size="sm" className="w-full">Manage</Button>
            </Link>
          ) : (
            <Link href={`${base}/${cohort.slug}/submit`} className="flex-1">
              <Button size="sm" className="w-full">Submit</Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
