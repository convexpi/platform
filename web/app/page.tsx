import Link from 'next/link'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { HeroViz } from '@/components/hero-viz'
import type { Cohort } from '@/lib/types'

export const dynamic = 'force-dynamic'

type AnomalyStat = {
  id: string
  slug?: string
  name: string
  source?: string
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
                Write a trading strategy. Submit it to a hidden holdout market.
                Learn whether your signal is real or noise — the same way empirical research does.
              </p>
              <blockquote className="border-l-2 border-[#C9A34E] pl-4 text-muted-foreground italic text-base">
                Reality is the final test set.
              </blockquote>
              <div className="flex items-center gap-3 pt-1">
                <Link href="/getting-started">
                  <Button size="lg"
                    className="bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-medium px-6">
                    Begin with Mission 1
                  </Button>
                </Link>
                <Link href="/research">
                  <Button size="lg" variant="outline"
                    className="border-border font-medium px-6">
                    Research library
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

      {/* ── Open source strip ─────────────────────────────────────────── */}
      <section className="border-b border-border bg-[#0B1F3A] text-white">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold tracking-[0.15em] text-white/50 uppercase">Open source</span>
              <span className="hidden sm:block w-px h-4 bg-white/20" />
              <code className="text-sm font-mono bg-white/10 text-white/90 px-2.5 py-1 rounded">
                pip install convexpi-lab
              </code>
              <span className="text-xs text-white/50">MIT License</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/convexpi/lab"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
              >
                <GitHubIcon className="w-3.5 h-3.5" />
                Source on GitHub
              </a>
              <a
                href="https://pypi.org/project/convexpi-lab/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
              >
                <PyPIIcon className="w-3.5 h-3.5" />
                convexpi-lab on PyPI
              </a>
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
                Open Problems
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
                    All open problems →
                  </Link>
                </div>
              </div>
            </div>

            {/* Research */}
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-5">
                Research Library
              </p>
              <div className="flex flex-col divide-y divide-border">
                {[
                  { title: 'Momentum', href: '/research/momentum', note: 'Strong OOS survival' },
                  { title: 'Value', href: '/research/value', note: 'Mixed OOS evidence' },
                  { title: 'Quality / Profitability', href: '/research/quality', note: 'Strong OOS survival' },
                  { title: 'Factor Zoo & Replication Crisis', href: '/research/factor-zoo', note: 'Why most factors fail' },
                ].map(item => (
                  <div key={item.href} className="py-3">
                    <Link href={item.href}
                      className="text-sm text-foreground font-medium leading-snug hover:text-primary transition-colors">
                      {item.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>
                  </div>
                ))}
                <div className="pt-4">
                  <Link href="/research"
                    className="text-xs font-medium text-[#C9A34E] hover:text-[#b8922d] transition-colors">
                    Full research library →
                  </Link>
                </div>
              </div>
            </div>

            {/* Courses */}
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-5">
                Curriculum — 6 Missions
              </p>
              <div className="flex flex-col divide-y divide-border">
                {[
                  { n: '01', title: 'Overfitting',        note: 'IS vs OOS Sharpe · hidden holdout' },
                  { n: '02', title: 'Market Maker',       note: 'Spread capture · inventory risk' },
                  { n: '03', title: 'Alpha Discovery',    note: 'Factor construction · signal decay' },
                  { n: '04', title: 'Strategy Library',   note: 'Replication · the factor zoo' },
                  { n: '05', title: 'Real Data',          note: 'Survivorship bias · stale prices' },
                  { n: '06', title: 'Advanced Agents',    note: 'RL execution · end-to-end strategy' },
                ].map(c => (
                  <div key={c.n} className="py-2.5 flex items-start gap-2.5">
                    <span className="text-xs font-mono text-muted-foreground/60 mt-0.5 shrink-0">{c.n}</span>
                    <div>
                      <p className="text-sm text-foreground font-medium leading-snug">{c.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.note}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-4">
                  <Link href="/curriculum"
                    className="text-xs font-medium text-[#C9A34E] hover:text-[#b8920d] transition-colors">
                    Full syllabus →
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
              In-sample performance is not evidence.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-2xl">
              Fit enough parameters to historical data and any strategy looks profitable.
              The only meaningful test is out-of-sample: data the strategy never touched during development.
              ConvexPi grades you the same way peer reviewers should — on a holdout you cannot see.
            </p>

            <div className="grid md:grid-cols-2 gap-4 max-w-xl">
              <div className="rounded-lg border border-border bg-card p-5">
                <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-2">
                  In-sample Sharpe
                </p>
                <p className="font-mono text-3xl font-bold text-foreground mb-2">IS Sharpe</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Measures fit to historical data. Easy to maximise through
                  overfitting. Does not predict future performance.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-xs text-muted-foreground">Not falsifiable</span>
                </div>
              </div>
              <div className="rounded-lg border border-[#C9A34E]/30 bg-[#C9A34E]/5 p-5">
                <p className="text-[10px] font-semibold tracking-[0.15em] text-[#C9A34E] uppercase mb-2">
                  Out-of-sample Sharpe
                </p>
                <p className="font-mono text-3xl font-bold text-foreground mb-2">OOS Sharpe</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Evaluated on a holdout market with a secret seed.
                  You cannot overfit data you cannot observe.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-[#C9A34E] font-medium">The experimental standard</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Factor anomaly evidence ───────────────────────────────────── */}
      {anomalies.length > 0 && (() => {
        const frenchFactors = anomalies.filter(a => !a.source || a.source === 'french')
        const osapCount = anomalies.filter(a => a.source === 'osap').length
        return (
          <section className="border-b border-border bg-secondary/40">
            <div className="container mx-auto px-4 py-20">
              <div className="max-w-3xl mb-10">
                <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-4">
                  Replication Evidence
                </p>
                <h2 className="font-serif text-3xl text-foreground mb-4">
                  Most published anomalies decay out-of-sample.
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We track {anomalies.length} equity factor anomalies pre- and post-publication
                  using the{' '}
                  <Link href="/anomalies" className="underline underline-offset-4 hover:text-foreground">
                    Open Source Asset Pricing
                  </Link>{' '}
                  dataset ({osapCount} predictors, 1926–2024) plus Kenneth French&apos;s flagship factors.
                  Some effects survive peer replication. Most attenuate sharply — a pattern
                  consistent with data mining rather than genuine risk premia.
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
                    {frenchFactors.map((a) => {
                      const isDead = a.status === 'dead'
                      const decayed = a.oos_sharpe < a.is_sharpe * 0.7
                      const slug = a.slug ?? a.id
                      return (
                        <tr key={a.name} className="hover:bg-secondary/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">
                            <Link href={`/anomalies/${slug}`}
                              className="hover:underline underline-offset-4">
                              {a.name}
                            </Link>
                          </td>
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
              <div className="mt-5 flex items-center gap-4">
                <Link href="/anomalies"
                  className="text-sm font-medium text-[#C9A34E] hover:text-[#b8922d] transition-colors">
                  All {anomalies.length} anomalies →
                </Link>
                <span className="text-xs text-muted-foreground">
                  filter by category, status, data type
                </span>
              </div>
            </div>
          </section>
        )
      })()}

      {/* ── Live leaderboard ──────────────────────────────────────────── */}
      {demoLeaderboard.length > 0 && (
        <section className="border-b border-border">
          <div className="container mx-auto px-4 py-20">
            <div className="grid lg:grid-cols-[1fr_440px] gap-14 items-start">
              <div>
                <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-4">
                  Worked Example
                </p>
                <h2 className="font-serif text-3xl text-foreground mb-5 leading-snug">
                  The lesson in one table.
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Strategies with the highest in-sample Sharpe often have the
                  worst out-of-sample Sharpe. The gap between them is the measure of overfitting.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  The{' '}
                  <span className="font-medium text-[#C9A34E]">OOS Sharpe</span>{' '}
                  is computed on a holdout market with a seed unavailable during development.
                  It cannot be gamed by parameter search.
                </p>
                <Link href="/compete/demo-fall-2026/leaderboard">
                  <Button variant="outline" size="sm">
                    View full results →
                  </Button>
                </Link>
              </div>

              <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-border bg-secondary/50 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-muted-foreground font-mono">Demo Cohort — Fall 2026</span>
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
              Learning Environments
            </p>
            <h2 className="font-serif text-3xl text-foreground">
              Three environments. One question.
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              Does your strategy generalise beyond the data used to build it?
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
                  'Six missions: foundations through ML methods',
                ],
                href: '/getting-started',
                cta: 'Begin Mission 1',
              },
              {
                label: 'Arena',
                accentColor: '#C9A34E',
                title: 'Live Market Arena',
                desc: 'Deploy agents that submit live orders to a limit-order-book simulation running in real time. Study adverse selection, inventory risk, and spread dynamics under competitive pressure.',
                bullets: [
                  'WebSocket agent API — connect in Python',
                  'Inventory risk, spread capture, adverse selection',
                  'Survival score measures robustness over Sharpe',
                ],
                href: '/compete',
                cta: 'Browse open problems',
              },
              {
                label: 'Courses',
                accentColor: '#6B7280',
                title: 'Instructor Cohorts',
                desc: 'Private cohorts for classroom settings. Assign missions as structured problem sets, grade via OOS Sharpe, and export gradebooks. Built for university courses.',
                bullets: [
                  'Private leaderboards with submission deadlines',
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

      {/* ── Open source detail ────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-4">
                Open Source
              </p>
              <h2 className="font-serif text-3xl text-foreground mb-5 leading-snug">
                Use it in your own research.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-5">
                <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">convexpi-lab</code> is
                MIT-licensed and available on PyPI. Use it to run the synthetic market locally,
                build your own backtesting experiments, or extend it for new research questions.
                The full source is on GitHub.
              </p>
              <div className="flex flex-col gap-3 mb-6">
                <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                  <span className="text-muted-foreground select-none">$ </span>
                  pip install convexpi-lab
                </div>
                <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                  <span className="text-muted-foreground select-none">{'>>> '}</span>
                  from convexpi.lab import SyntheticMarket, SimpleBacktest
                </div>
              </div>
              <div className="flex gap-3">
                <a
                  href="https://github.com/convexpi/lab"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <GitHubIcon className="w-3.5 h-3.5" />
                    GitHub
                  </Button>
                </a>
                <a
                  href="https://pypi.org/project/convexpi-lab/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <PyPIIcon className="w-3.5 h-3.5" />
                    PyPI
                  </Button>
                </a>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: 'SyntheticMarket', desc: 'Generates reproducible equity panels with planted factor signals and configurable noise. Deterministic by seed — grader and student see the same market structure, different realisations.' },
                { label: 'SimpleBacktest', desc: 'Long-short backtester that calls your strategy daily and reports IS Sharpe, OOS Sharpe, max drawdown, and turnover. Designed for the predict(features) interface.' },
                { label: 'Grader', desc: 'Evaluates strategies on a hidden holdout. Measures alpha discovery — how much of the planted signal your strategy recovered — alongside standard performance metrics.' },
                { label: 'RealDataMarket', desc: 'Wraps yfinance and Fama-French data to run the same backtesting workflow on live equity data. Used in Mission 5.' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-4 rounded-lg border bg-card/40">
                  <div>
                    <p className="text-sm font-mono font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Community ─────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-secondary/40">
        <div className="container mx-auto px-4 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-4">
                Community
              </p>
              <h2 className="font-serif text-3xl text-foreground mb-5 leading-snug">
                Learn in the open. Follow the work.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Every submission is graded and its OOS result published.
                Follow other researchers to see their results as they come in.
                Share your code on GitHub so others can understand your approach — the same norm as open science.
              </p>
              <div className="flex gap-3">
                <Link href="/community">
                  <Button className="bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white">
                    Browse researchers
                  </Button>
                </Link>
                <Link href="/research">
                  <Button variant="outline">Research library</Button>
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Follow researchers', desc: 'See their submissions and OOS Sharpe results in your activity feed as they are graded.' },
                { label: 'Share your methodology', desc: 'Link a GitHub repository to your submission so others can study your approach and build on it.' },
                { label: 'Research library', desc: '9 factor deep-dives with key papers, OOS survival evidence, and the missions that explore each idea.' },
                { label: 'Replication tracker', desc: 'Pre- and post-publication Sharpe ratios for canonical equity anomalies tracked against live data.' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg border bg-card/40">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────── */}
      <section>
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-2xl">
            <h2 className="font-serif text-4xl lg:text-5xl text-foreground mb-5 leading-snug">
              Does your model generalise?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Mission 1 takes about thirty minutes. You will build a strategy,
              see it score well in-sample, then watch it fail out-of-sample — and understand why.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/getting-started">
                <Button size="lg"
                  className="bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-medium px-8">
                  Begin Mission 1
                </Button>
              </Link>
              <a href="https://github.com/convexpi/lab" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="font-medium px-8 gap-2">
                  <GitHubIcon className="w-4 h-4" />
                  View source
                </Button>
              </a>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Open source · MIT License · Python · convexpi-lab on{' '}
              <a href="https://pypi.org/project/convexpi-lab/" target="_blank" rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-foreground transition-colors">
                PyPI
              </a>
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

function PyPIIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.001 0C5.928 0 6.31 2.578 6.31 2.578l.007 2.67h5.784v.803H3.96S0 5.595 0 11.74c0 6.146 3.403 5.927 3.403 5.927h2.031v-2.85s-.11-3.403 3.347-3.403h5.763s3.239.052 3.239-3.13V3.19S18.28 0 12.001 0zM8.85 1.843a1.01 1.01 0 110 2.022 1.01 1.01 0 010-2.022zM11.999 24c6.073 0 5.691-2.578 5.691-2.578l-.007-2.67h-5.784v-.803h8.141S24 18.405 24 12.26c0-6.146-3.403-5.927-3.403-5.927h-2.031v2.85s.11 3.403-3.347 3.403H9.456s-3.239-.052-3.239 3.13V20.81S5.72 24 12 24zm3.151-1.843a1.01 1.01 0 110-2.022 1.01 1.01 0 010 2.022z" />
    </svg>
  )
}
