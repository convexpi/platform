import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HeroViz } from '@/components/hero-viz'
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
    .limit(3)

  return (
    <div className="flex flex-col">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left: text */}
            <div className="flex flex-col gap-6 max-w-xl">
              <p className="text-sm font-medium tracking-widest text-[#3b82f6] uppercase">
                Experiment · Evaluate · Excel
              </p>
              <h1 className="font-serif text-5xl lg:text-6xl leading-[1.1] text-foreground">
                Learn Quantitative Finance Through Experimentation
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Build trading strategies. Test them against hidden out-of-sample data.
                Compete in live market simulations.
              </p>
              <p className="text-base font-medium text-[#14b8a6]">
                Reality is the final test set.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <Link href="/getting-started">
                  <Button size="lg" className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium px-6">
                    Start Building
                  </Button>
                </Link>
                <Link href="/compete">
                  <Button size="lg" variant="outline"
                    className="border-border text-foreground hover:bg-accent font-medium px-6">
                    Explore Competitions
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: visualization */}
            <div className="hidden lg:flex items-center justify-center h-96 rounded-2xl border border-border bg-card/30 backdrop-blur overflow-hidden">
              <HeroViz />
            </div>
          </div>
        </div>

        {/* Background radial glow */}
        <div className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 70% 40%, oklch(0.6 0.2 260 / 0.06), transparent)' }} />
      </section>

      {/* ── Three pillars ─────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="container mx-auto px-4 py-20">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-10">
            A complete platform for learning and discovery
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.607L5 14.5m14.8.5l.2 2M5 14.5l-.2 2m0 0l-.467 1.4a1.125 1.125 0 001.072 1.472h12.19a1.125 1.125 0 001.072-1.472l-.467-1.4m-13.4 0h13.4" />
                  </svg>
                ),
                color: '#3b82f6',
                label: 'Lab',
                title: 'Discover Alpha',
                desc: 'Build and backtest systematic strategies on a synthetic equity panel with hidden planted signals. Graded on out-of-sample performance — not IS curve-fitting.',
                href: '/getting-started',
              },
              {
                icon: (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                  </svg>
                ),
                color: '#14b8a6',
                label: 'Arena',
                title: 'Compete Live',
                desc: 'Deploy agents into a real-time limit-order-book simulation. Trade against classmates and market-making bots. Survival score tracks who lasts.',
                href: '/compete',
              },
              {
                icon: (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                ),
                color: '#f59e0b',
                label: 'Courses',
                title: 'Structured Curriculum',
                desc: 'Six missions from Sharpe ratios to market microstructure. Instructor-led cohorts with private leaderboards, gradebooks, and assignment deadlines.',
                href: '/getting-started',
              },
            ].map(p => (
              <Link key={p.label} href={p.href} className="group flex flex-col gap-4 p-6 rounded-xl border border-border bg-card/40 hover:bg-card transition-colors">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${p.color}18`, color: p.color }}>
                  {p.icon}
                </div>
                <div>
                  <p className="text-xs font-medium tracking-widest uppercase mb-1"
                    style={{ color: p.color }}>{p.label}</p>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live competitions ──────────────────────────────────────────── */}
      {competitions && competitions.length > 0 && (
        <section className="border-t border-border">
          <div className="container mx-auto px-4 py-20">
            <div className="flex items-baseline justify-between mb-10">
              <div>
                <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-2">
                  Live Competitions
                </p>
                <h2 className="text-2xl font-semibold text-foreground">Open now</h2>
              </div>
              <Link href="/compete"
                className="text-sm text-[#3b82f6] hover:text-[#2563eb] transition-colors font-medium">
                View all →
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {(competitions as Cohort[]).map(c => <CompetitionCard key={c.id} cohort={c} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── For educators ─────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="container mx-auto px-4 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-3">
                For Educators
              </p>
              <h2 className="text-3xl font-serif text-foreground mb-4">
                Private cohorts for your classroom
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Run a semester-long competition with private leaderboards, custom market seeds,
                and FERPA-compliant grade exports. Students compete; you see everything.
              </p>
              <Link href="/classroom/new">
                <Button variant="outline" className="border-border">Create a cohort</Button>
              </Link>
            </div>
            <div className="rounded-xl border border-border bg-card/40 p-6 font-mono text-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#14b8a6]" />
                <span className="text-muted-foreground text-xs">demo-fall-2026 · active</span>
              </div>
              {[
                { rank: 1, name: 'Equal Weight',    sharpe: '0.10', status: 'completed' },
                { rank: 2, name: 'Naive Momentum',  sharpe: '-0.05', status: 'completed' },
                { rank: 3, name: 'Random Noise',    sharpe: '-0.80', status: 'completed' },
              ].map(row => (
                <div key={row.rank} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground w-4">#{row.rank}</span>
                    <span className="text-foreground">{row.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={parseFloat(row.sharpe) >= 0 ? 'text-[#14b8a6]' : 'text-red-400'}>
                      {row.sharpe}
                    </span>
                    <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                      {row.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

function CompetitionCard({ cohort }: { cohort: Cohort }) {
  const isActive = cohort.status === 'active'
  return (
    <div className="flex flex-col gap-4 p-6 rounded-xl border border-border bg-card/40 hover:bg-card transition-colors">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground leading-snug">{cohort.name}</h3>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
          isActive
            ? 'bg-[#14b8a6]/15 text-[#14b8a6]'
            : cohort.status === 'ended'
            ? 'bg-muted text-muted-foreground'
            : 'bg-[#f59e0b]/15 text-[#f59e0b]'
        }`}>
          {cohort.status}
        </span>
      </div>
      {cohort.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {cohort.description}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between pt-2">
        {cohort.end_date
          ? <span className="text-xs text-muted-foreground">
              Ends {new Date(cohort.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          : <span />
        }
        <Link href={`/compete/${cohort.slug}`}>
          <Button size="sm"
            className={isActive
              ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white'
              : 'border border-border bg-transparent text-foreground hover:bg-accent'
            }>
            {isActive ? 'Enter now' : 'View'}
          </Button>
        </Link>
      </div>
    </div>
  )
}
