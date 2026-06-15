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
    .limit(4)

  const { data: demoRows } = await supabase
    .from('grade_reports')
    .select('is_sharpe, oos_sharpe, overfitting_ratio, submissions(strategy_name)')
    .order('oos_sharpe', { ascending: false })
    .limit(5)

  const demoLeaderboard = (demoRows ?? []) as unknown as GradeReport[]

  return (
    <div className="flex flex-col">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-20 lg:py-28">
          <div className="grid lg:grid-cols-[1fr_480px] gap-16 items-center">
            <div className="flex flex-col gap-7 max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.2em] text-[#C9A34E] uppercase">
                Quantitative Finance · Experimental Method
              </p>
              <h1 className="font-serif text-5xl lg:text-6xl xl:text-7xl leading-[1.05] text-foreground">
                Discover what survives{' '}
                <span className="italic">out&#8209;of&#8209;sample.</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                Build trading strategies in Python. Submit them to a hidden holdout market.
                Compete on the only grade that matters in finance.
              </p>
              <blockquote className="border-l-2 border-[#C9A34E] pl-4 text-muted-foreground italic text-base">
                Reality is the final test set.
              </blockquote>
              <div className="flex items-center gap-3 pt-1">
                <Link href="/getting-started">
                  <Button size="lg"
                    className="bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-medium px-6">
                    Start Building
                  </Button>
                </Link>
                <Link href="/compete">
                  <Button size="lg" variant="outline"
                    className="border-border font-medium px-6">
                    Explore Competitions
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden lg:flex items-center justify-center h-[360px]">
              <HeroViz />
            </div>
          </div>
        </div>
      </section>

      {/* ── Research artifacts ────────────────────────────────────────── */}
      <section className="border-b border-border bg-secondary/40">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-10">

            {/* Competitions */}
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-5">
                Active Competitions
              </p>
              <div className="flex flex-col divide-y divide-border">
                {competitions && competitions.length > 0
                  ? (competitions as Cohort[]).map(c => (
                    <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                      <span className="text-sm text-foreground font-medium leading-snug">{c.name}</span>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-secondary text-muted-foreground'
                      }`}>{c.status}</span>
                    </div>
                  ))
                  : [
                    { name: 'US Equity Alpha Challenge', participants: 324 },
                    { name: 'Market Making Arena', participants: 118 },
                    { name: 'Macro Forecasting Challenge', participants: 87 },
                  ].map(c => (
                    <div key={c.name} className="py-3 flex items-center justify-between gap-4">
                      <span className="text-sm text-foreground font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{c.participants}</span>
                    </div>
                  ))
                }
                <div className="pt-4">
                  <Link href="/compete"
                    className="text-xs font-medium text-[#C9A34E] hover:text-[#b8922d] transition-colors">
                    All competitions →
                  </Link>
                </div>
              </div>
            </div>

            {/* Research */}
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-5">
                Research
              </p>
              <div className="flex flex-col divide-y divide-border">
                {[
                  'Overfitting in Cross-Sectional Equity Signals',
                  'Hidden Holdout Evaluation Framework',
                  'Factor Zoo Decay: 2000–2024',
                  'Reinforcement Learning Market Makers',
                ].map(title => (
                  <div key={title} className="py-3">
                    <p className="text-sm text-foreground leading-snug">{title}</p>
                  </div>
                ))}
                <div className="pt-4">
                  <Link href="/anomalies"
                    className="text-xs font-medium text-[#C9A34E] hover:text-[#b8922d] transition-colors">
                    Anomaly tracker →
                  </Link>
                </div>
              </div>
            </div>

            {/* Courses */}
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-5">
                Curriculum
              </p>
              <div className="flex flex-col divide-y divide-border">
                {[
                  { title: 'Introduction to Quantitative Finance', level: 'Foundations' },
                  { title: 'Machine Learning for Markets', level: 'Intermediate' },
                  { title: 'Market Microstructure & HFT', level: 'Advanced' },
                  { title: 'Alpha Decay & Portfolio Construction', level: 'Advanced' },
                ].map(c => (
                  <div key={c.title} className="py-3">
                    <p className="text-sm text-foreground font-medium leading-snug">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.level}</p>
                  </div>
                ))}
                <div className="pt-4">
                  <Link href="/classroom/new"
                    className="text-xs font-medium text-[#C9A34E] hover:text-[#b8922d] transition-colors">
                    Create a cohort →
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Core insight ──────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-4">
              The Problem
            </p>
            <h2 className="font-serif text-3xl lg:text-4xl text-foreground mb-6 leading-snug">
              Most platforms grade the wrong thing.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-2xl">
              In-sample Sharpe is easy to manufacture. Fit the noise, overoptimize
              the parameters, and your backtest looks excellent. Then you trade live and lose money.
              ConvexPi grades you the way the market does — on data you have never seen.
            </p>

            <div className="grid md:grid-cols-2 gap-4 max-w-xl">
              <div className="rounded-lg border border-border bg-card p-5">
                <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-2">
                  What most platforms grade
                </p>
                <p className="font-mono text-3xl font-bold text-foreground mb-2">IS Sharpe</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  In-sample performance on data you trained on.
                  Meaningless in live trading. Easy to overfit.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-xs text-muted-foreground">Gameable</span>
                </div>
              </div>
              <div className="rounded-lg border border-[#C9A34E]/30 bg-[#C9A34E]/5 p-5">
                <p className="text-[10px] font-semibold tracking-[0.15em] text-[#C9A34E] uppercase mb-2">
                  What ConvexPi grades
                </p>
                <p className="font-mono text-3xl font-bold text-foreground mb-2">OOS Sharpe</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Performance on a holdout market with a secret seed.
                  You cannot overfit what you cannot see.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-[#C9A34E] font-medium">The only grade that matters</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Factor anomaly evidence ───────────────────────────────────── */}
      {anomalies.length > 0 && (
        <section className="border-b border-border bg-secondary/40">
          <div className="container mx-auto px-4 py-20">
            <div className="max-w-3xl mb-10">
              <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-4">
                Evidence
              </p>
              <h2 className="font-serif text-3xl text-foreground mb-4">
                Most published anomalies decay out-of-sample.
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We track the Fama-French factor zoo against live markets.
                Some effects survive. Many do not. This is what you are competing to find.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-secondary border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">Anomaly</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">IS Sharpe</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">OOS Sharpe</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {anomalies.slice(0, 6).map((a) => {
                    const isDead = a.status === 'dead'
                    const decayed = a.oos_sharpe < a.is_sharpe * 0.7
                    return (
                      <tr key={a.name} className="hover:bg-secondary/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{a.name}</td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                          {a.is_sharpe.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold ${
                          isDead ? 'text-red-500' : decayed ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {a.oos_sharpe.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isDead
                              ? 'bg-red-100 text-red-600'
                              : decayed
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-5">
              <Link href="/anomalies"
                className="text-sm font-medium text-[#C9A34E] hover:text-[#b8922d] transition-colors">
                Full anomaly tracker →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Live leaderboard ──────────────────────────────────────────── */}
      {demoLeaderboard.length > 0 && (
        <section className="border-b border-border">
          <div className="container mx-auto px-4 py-20">
            <div className="grid lg:grid-cols-[1fr_440px] gap-14 items-start">
              <div>
                <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-4">
                  Live Example
                </p>
                <h2 className="font-serif text-3xl text-foreground mb-5 leading-snug">
                  The lesson in one table.
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Strategies with the highest in-sample Sharpe often have the
                  worst out-of-sample Sharpe. That gap is overfitting.
                  ConvexPi ranks you on the right column.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  The{' '}
                  <span className="font-medium text-[#C9A34E]">OOS Sharpe</span>{' '}
                  is computed on a holdout market with a seed you never see.
                  Build strategies that survive data they have never encountered.
                </p>
                <Link href="/compete/demo-fall-2026/leaderboard">
                  <Button variant="outline" size="sm">
                    View full leaderboard →
                  </Button>
                </Link>
              </div>

              <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-border bg-secondary/50 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-muted-foreground font-mono">Demo Competition — Fall 2026</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">Strategy</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">IS</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold tracking-[0.1em] text-[#C9A34E] uppercase">OOS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {demoLeaderboard.map((row, i) => (
                      <tr key={i} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 text-foreground font-medium text-xs truncate max-w-[160px]">
                          {row.submissions?.strategy_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                          {row.is_sharpe?.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${
                          (row.oos_sharpe ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'
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

      {/* ── Platform ──────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-secondary/40">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-xl mb-12">
            <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-4">
              Platform
            </p>
            <h2 className="font-serif text-3xl text-foreground">
              Three environments. One question.
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              Can your strategy survive data it has never seen?
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                label: 'Lab',
                accentColor: '#0B1F3A',
                title: 'Alpha Discovery Lab',
                desc: 'Write strategies against a synthetic equity panel with embedded factor signals. Six structured missions take you from naive overfitting to disciplined out-of-sample evaluation.',
                bullets: [
                  'Python-native (pandas, numpy, scikit-learn)',
                  'IS / OOS breakdown on every submission',
                  'Six missions: intro through ML methods',
                ],
                href: '/getting-started',
                cta: 'Start Mission 1',
              },
              {
                label: 'Arena',
                accentColor: '#C9A34E',
                title: 'Live Market Arena',
                desc: 'Deploy agents that submit live orders to a limit-order-book simulation running in real time. Compete against classmates, market makers, and noise traders.',
                bullets: [
                  'WebSocket agent API — connect in Python',
                  'Inventory risk, spread capture, adverse selection',
                  'Survival score replaces Sharpe ratio',
                ],
                href: '/compete',
                cta: 'Browse competitions',
              },
              {
                label: 'Courses',
                accentColor: '#6B7280',
                title: 'Instructor Cohorts',
                desc: 'Private competitions for classroom settings. Assign missions as homework, grade via OOS Sharpe, export gradebooks. FERPA-compliant by default.',
                bullets: [
                  'Private leaderboards with deadlines',
                  'Instructor dashboard and gradebook export',
                  'University of Cincinnati — Fall 2026 cohort active',
                ],
                href: '/classroom/new',
                cta: 'Create a cohort',
              },
            ].map(p => (
              <div key={p.label}
                className="flex flex-col gap-4 p-6 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-2"
                    style={{ color: p.accentColor }}>{p.label}</p>
                  <h3 className="text-base font-semibold text-foreground mb-3">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{p.desc}</p>
                  <ul className="flex flex-col gap-1.5">
                    {p.bullets.map(b => (
                      <li key={b} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="mt-1.5 w-1 h-1 rounded-full shrink-0 bg-border" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto pt-3 border-t border-border">
                  <Link href={p.href}
                    className="text-xs font-semibold transition-colors hover:opacity-70"
                    style={{ color: p.accentColor }}>
                    {p.cta} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────── */}
      <section>
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-2xl">
            <h2 className="font-serif text-4xl lg:text-5xl text-foreground mb-5 leading-snug">
              Can your model survive unseen data?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Mission 1 takes 30 minutes. Build a strategy in Python, submit it,
              and see how it holds up against a market it has never touched.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/getting-started">
                <Button size="lg"
                  className="bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-medium px-8">
                  Start Mission 1 — free
                </Button>
              </Link>
              <Link href="https://github.com/convexpi" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="font-medium px-8">
                  View on GitHub
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Open source · MIT License · Python-first
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}
