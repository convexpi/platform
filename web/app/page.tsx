import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Cohort } from '@/lib/types'

export const dynamic = 'force-dynamic'
export default async function Home() {
  const supabase = await createClient()
  const { data: competitions } = await supabase
    .from('cohorts')
    .select('*')
    .eq('type', 'competition')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(6)

  return (
    <div className="flex flex-col">
      <section className="container mx-auto px-4 py-24 text-center">
        <Badge variant="secondary" className="mb-4">ConvexPi · Open Source · MIT License</Badge>
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Learn quant finance<br />by doing it live
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Compete in live limit-order-book arenas, discover hidden alpha signals,
          and get graded on out-of-sample performance — not in-sample curve fitting.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/getting-started"><Button size="lg">Get started in 30 min</Button></Link>
          <Link href="/compete"><Button size="lg" variant="outline">Browse competitions</Button></Link>
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-16 grid md:grid-cols-3 gap-8">
          {[
            { icon: '📈', title: 'Live Arena', desc: 'Real-time limit-order-book simulation. Connect your agent via WebSocket and trade against classmates and background market makers.' },
            { icon: '🔬', title: 'Alpha Discovery Lab', desc: 'Synthetic equity panel with hidden planted signals. Find them. The grader tests you on a holdout you never saw.' },
            { icon: '🏆', title: 'Anti-Overfitting Grader', desc: 'In-sample Sharpe is cheap. Your grade is OOS/IS ratio — the lesson Quantopian learned too late.' },
          ].map(f => (
            <div key={f.title} className="flex flex-col gap-3">
              <span className="text-4xl">{f.icon}</span>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {competitions && competitions.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Open competitions</h2>
            <Link href="/compete" className="text-sm text-muted-foreground hover:text-primary">View all →</Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {(competitions as Cohort[]).map(c => <CompetitionCard key={c.id} cohort={c} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function CompetitionCard({ cohort }: { cohort: Cohort }) {
  const statusColor = { upcoming: 'secondary', active: 'default', ended: 'outline' } as const
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{cohort.name}</CardTitle>
          <Badge variant={statusColor[cohort.status]}>{cohort.status}</Badge>
        </div>
        {cohort.description && <CardDescription className="line-clamp-2">{cohort.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          {cohort.end_date && <span className="text-xs text-muted-foreground">Ends {new Date(cohort.end_date).toLocaleDateString()}</span>}
          <Link href={`/compete/${cohort.slug}`}>
            <Button size="sm" variant={cohort.status === 'active' ? 'default' : 'outline'}>
              {cohort.status === 'active' ? 'Enter now' : 'View'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
