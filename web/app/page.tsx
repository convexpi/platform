import Link from 'next/link'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { HeroViz } from '@/components/hero-viz'
import type { Cohort } from '@/lib/types'

export const dynamic = 'force-dynamic'

type AnomalyStat = {
  name: string
  is_sharpe: number
  oos_sharpe: number
  decay_pct: number
  status: string
}

type GradeReport = {
  is_sharpe: number
  oos_sharpe: number
  overfitting_ratio: number
  submissions: { strategy_name: string }
}

function loadAnomalyStats(): AnomalyStat[] {
  try {
    const raw = readFileSync(join(process.cwd(), 'public/anomaly-stats.json'), 'utf8')
    return JSON.parse(raw).anomalies as AnomalyStat[]
  } catch {
    return []
  }
}

export default async function Home() {
  const supabase = await createClient()
  const anomalies = loadAnomalyStats()

  const { data: competitions } = await supabase
    .from('cohorts')
    .select('*')
    .eq('type', 'competition')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(3)

  // Fetch demo leaderboard rows for the homepage illustration
  const { data: demoRows } = await supabase
    .from('grade_reports')
    .select('is_sharpe, oos_sharpe, overfitting_ratio, submissions(strategy_name)')
    .order('oos_sharpe', { ascending: false })
    .limit(6)

  const demoLeaderboard = (demoRows ?? []) as unknown as GradeReport[]

  return (
    <div className="flex flex-col">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
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
            <div className="hidden lg:flex items-center justify-center h-96 rounded-2xl border border-border bg-card/30 overflow-hidden">
              <HeroViz />
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 70% 40%, oklch(0.6 0.2 260 / 0.06), transparent)' }} />
      </section>

      {/* ── Core insight ──────────────────────────────────────────────── */}
      <section className="border-t border-border bg-card/20">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="font-serif text-3xl lg:text-4xl text-foreground mb-4">
              The problem with backtesting
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Most platforms reward in-sample Sharpe. That&apos;s easy to game — fit the noise,
              overoptimize the parameters, and your backtest looks great.
              Then you trade live and lose money. ConvexPi grades you the way markets do.
            </p>
          </div>

          {/* IS vs OOS comparison */}
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-10">
            <div className="rounded-xl border border-border bg-card/60 p-6">
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-3">
                What most platforms grade
              </p>
              <p className="font-mono text-4xl font-bold text-foreground mb-2">IS Sharpe</p>
              <p className="text-sm text-muted-foreground">
                Performance on the same data you trained on.
                Easy to overfit. Meaningless in live trading.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400/60" />
                <span className="text-xs text-muted-foreground">Gameable</span>
              </div>
            </div>
            <div className="rounded-xl border border-[#14b8a6]/40 bg-[#14b8a6]/5 p-6">
              <p className="text-xs font-medium tracking-widest text-[#14b8a6] uppercase mb-3">
                What ConvexPi grades
              </p>
              <p className="font-mono text-4xl font-bold text-foreground mb-2">OOS Sharpe</p>
              <p className="text-sm text-muted-foreground">
                Performance on a holdout market you never saw.
                The seed stays secret. You can&apos;t overfit what you can&apos;t see.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#14b8a6]" />
                <span className="text-xs text-[#14b8a6]">The only grade that matters</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="container mx-auto px-4 py-20">
          <div className="mb-12">
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-2">
              How it works
            </p>
            <h2 className="text-2xl font-semibold text-foreground">From idea to track record</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-0">
            {[
              {
                step: '01',
                color: '#3b82f6',
                title: 'Build',
                desc: 'Write a Python strategy using our synthetic equity panel. Explore momentum, mean-reversion, ML signals — whatever hypothesis you want to test.',
              },
              {
                step: '02',
                color: '#14b8a6',
                title: 'Backtest',
                desc: 'See your in-sample Sharpe, drawdowns, turnover. Get instant feedback on how your strategy behaves historically.',
              },
              {
                step: '03',
                color: '#f59e0b',
                title: 'Hidden evaluation',
                desc: 'Submit to a competition. Your strategy runs on a holdout market with a secret seed. This is your real grade — data you never touched.',
              },
              {
                step: '04',
                color: '#a78bfa',
                title: 'Track record',
                desc: 'Rankings persist. Top strategies build a public track record. Great for portfolios, research, and recruiting.',
              },
            ].map((s, i) => (
              <div key={i} className="relative flex flex-col gap-4 p-6 border-l first:border-l-0 md:border-l border-t md:border-t-0 border-border">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">{s.step}</span>
                  <div className="h-px flex-1 bg-border" />
                  {i < 3 && <span className="text-muted-foreground text-xs hidden md:inline">→</span>}
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: `${s.color}18`, color: s.color }}>
                  {i + 1}
                </div>
                <h3 className="font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live demo leaderboard ─────────────────────────────────────── */}
      {demoLeaderboard.length > 0 && (
        <section className="border-t border-border bg-card/20">
          <div className="container mx-auto px-4 py-20">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <div>
                <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-3">
                  Live example
                </p>
                <h2 className="font-serif text-3xl text-foreground mb-4">
                  The lesson in one table
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Random Noise has the highest in-sample Sharpe. It has the worst out-of-sample Sharpe.
                  That&apos;s the entire lesson of quantitative finance in three rows.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  The <span className="text-[#14b8a6] font-medium">OOS Sharpe column</span> is what
                  ConvexPi actually ranks you on. Build strategies that survive data they&apos;ve never seen.
                </p>
                <Link href="/compete/demo-fall-2026/leaderboard">
                  <Button variant="outline" className="border-border">
                    View full leaderboard →
                  </Button>
                </Link>
              </div>

              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#14b8a6]" />
                  <span className="text-xs text-muted-foreground font-mono">Demo Competition — Fall 2026</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Strategy</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">IS Sharpe</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-[#14b8a6] uppercase tracking-wider">OOS Sharpe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoLeaderboard.map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-foreground font-medium">
                          {row.submissions?.strategy_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                          {row.is_sharpe?.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold ${
                          (row.oos_sharpe ?? 0) >= 0 ? 'text-[#14b8a6]' : 'text-red-400'
                        }`}>
                          {row.oos_sharpe?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Factor anomaly research ───────────────────────────────────── */}
      {anomalies.length > 0 && (
        <section className="border-t border-border">
          <div className="container mx-auto px-4 py-20">
            <div className="mb-10">
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-2">
                Research
              </p>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Real market anomalies. Real decay.
              </h2>
              <p className="text-muted-foreground max-w-xl">
                We track the Fama-French factor zoo against live markets. Most published anomalies are
                weaker out-of-sample than their papers claimed. Some are dead. This is what you&apos;re
                competing to find.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {anomalies.map((a) => {
                const decayed = a.oos_sharpe < a.is_sharpe
                const isDead = a.status === 'dead'
                return (
                  <div key={a.name}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/40">
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        IS {a.is_sharpe.toFixed(2)} → OOS {a.oos_sharpe.toFixed(2)}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      isDead
                        ? 'bg-red-500/10 text-red-400'
                        : decayed
                        ? 'bg-[#f59e0b]/10 text-[#f59e0b]'
                        : 'bg-[#14b8a6]/10 text-[#14b8a6]'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="mt-6">
              <Link href="/anomalies" className="text-sm text-[#3b82f6] hover:text-[#2563eb] transition-colors">
                Explore full anomaly tracker →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Three pillars ─────────────────────────────────────────────── */}
      <section className="border-t border-border bg-card/20">
        <div className="container mx-auto px-4 py-20">
          <div className="mb-10">
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-2">
              Platform
            </p>
            <h2 className="text-2xl font-semibold text-foreground">Three ways to learn</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.607L5 14.5m14.8.5l.2 2M5 14.5l-.2 2m0 0l-.467 1.4a1.125 1.125 0 001.072 1.472h12.19a1.125 1.125 0 001.072-1.472l-.467-1.4m-13.4 0h13.4" />
                  </svg>
                ),
                color: '#3b82f6',
                label: 'Lab',
                title: 'Alpha Discovery Lab',
                bullets: [
                  'Synthetic equity panel with planted factor signals',
                  'Python-native: pandas, numpy, scikit-learn',
                  'Instant IS/OOS breakdown on every backtest',
                  'Six structured missions from intro to ML',
                ],
                href: '/getting-started',
                cta: 'Start Mission 1',
              },
              {
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                  </svg>
                ),
                color: '#14b8a6',
                label: 'Arena',
                title: 'Live Market Arena',
                bullets: [
                  'Real-time limit-order-book simulation',
                  'Connect agents via WebSocket',
                  'Trade against classmates and market makers',
                  'Survival score tracks who lasts under pressure',
                ],
                href: '/compete',
                cta: 'Browse competitions',
              },
              {
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                ),
                color: '#f59e0b',
                label: 'Courses',
                title: 'Structured Curriculum',
                bullets: [
                  'Instructor-led private cohorts',
                  'Assignments with hard deadlines',
                  'Private leaderboards, gradebook export',
                  'FERPA-compliant by default',
                ],
                href: '/classroom/new',
                cta: 'Create a cohort',
              },
            ].map(p => (
              <div key={p.label} className="flex flex-col gap-5 p-6 rounded-xl border border-border bg-card/40 hover:bg-card transition-colors">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${p.color}18`, color: p.color }}>
                  {p.icon}
                </div>
                <div>
                  <p className="text-xs font-medium tracking-widest uppercase mb-1"
                    style={{ color: p.color }}>{p.label}</p>
                  <h3 className="text-lg font-semibold text-foreground mb-4">{p.title}</h3>
                  <ul className="flex flex-col gap-2">
                    {p.bullets.map(b => (
                      <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 w-1 h-1 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto pt-2">
                  <Link href={p.href}
                    className="text-sm font-medium transition-colors"
                    style={{ color: p.color }}>
                    {p.cta} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Open competitions ─────────────────────────────────────────── */}
      {competitions && competitions.length > 0 && (
        <section className="border-t border-border">
          <div className="container mx-auto px-4 py-20">
            <div className="flex items-baseline justify-between mb-10">
              <div>
                <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-2">
                  Open now
                </p>
                <h2 className="text-2xl font-semibold text-foreground">Active competitions</h2>
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

      {/* ── Bottom CTA ────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="container mx-auto px-4 py-24 text-center">
          <h2 className="font-serif text-4xl text-foreground mb-4">
            Can your model survive unseen data?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
            Start with Mission 1. Takes 30 minutes. Build a strategy, submit it, and appear on the
            public leaderboard.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/getting-started">
              <Button size="lg" className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium px-8">
                Start Mission 1 — free
              </Button>
            </Link>
            <Link href="https://github.com/convexpi" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="border-border font-medium px-8">
                View on GitHub
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Open source · MIT License · Python-first
          </p>
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
