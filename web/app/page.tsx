import Link from 'next/link'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { HeroViz } from '@/components/hero-viz'

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

const ORG = 'https://github.com/convexpi'

export default async function Home() {
  const supabase = await createClient()
  const anomalies = loadAnomalyStats()

  const { data: demoRows } = await supabase
    .from('grade_reports')
    .select('is_sharpe, oos_sharpe, overfitting_ratio, submissions(strategy_name)')
    .order('oos_sharpe', { ascending: false })
    .limit(5)

  const demoLeaderboard = (demoRows ?? []) as unknown as GradeReport[]

  // Featured community projects (posts.author_id references auth.users, so authors are fetched separately).
  const { data: featRows } = await supabase
    .from('posts')
    .select('slug, title, summary, tags, has_strategy, author_id')
    .eq('status', 'published').eq('featured', true)
    .order('published_at', { ascending: false }).limit(3)
  const featured = (featRows ?? []) as { slug: string; title: string; summary: string | null; tags: string[]; has_strategy: boolean; author_id: string }[]
  const fIds = [...new Set(featured.map(p => p.author_id))]
  const { data: fProfs } = fIds.length
    ? await supabase.from('profiles').select('id, username, display_name').in('id', fIds)
    : { data: [] as { id: string; username: string | null; display_name: string | null }[] }
  const fBy = new Map((fProfs ?? []).map(p => [p.id, p]))

  return (
    <div className="flex flex-col">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-20 lg:py-28">
          <div className="grid lg:grid-cols-[1fr_480px] gap-16 items-center">
            <div className="flex flex-col gap-7 max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.2em] text-[#C9A34E] uppercase">
                Quantitative Finance · Experimental Method · Open Source
              </p>
              <h1 className="font-serif text-5xl lg:text-6xl xl:text-7xl leading-[1.05] text-foreground">
                Discover what works{' '}
                <span className="italic">in the real world.</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                An open platform for empirical finance. <strong className="text-foreground font-medium">Learn</strong> the
                methods, <strong className="text-foreground font-medium">experiment</strong> against hidden
                holdouts and live markets, and <strong className="text-foreground font-medium">contribute</strong> to
                a shared research commons — code, replications, and wikis, all in the open.
              </p>
              <blockquote className="border-l-2 border-[#C9A34E] pl-4 text-muted-foreground italic text-base">
                Reality is the final test set.
              </blockquote>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link href="/getting-started">
                  <Button size="lg"
                    className="bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-medium px-6">
                    Begin with Mission 1
                  </Button>
                </Link>
                <Link href="/playground">
                  <Button size="lg" variant="outline"
                    className="border-border font-medium px-6">
                    Run the playground
                  </Button>
                </Link>
                <Link href="/compete">
                  <Button size="lg" variant="outline"
                    className="border-border font-medium px-6">
                    See the competitions
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

      {/* ── Three pathways ────────────────────────────────────────────── */}
      <section className="border-b border-border bg-secondary/40">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-3">
              Three ways in
            </p>
            <h2 className="font-serif text-3xl text-foreground leading-snug">
              Learn it. Experiment with it. Contribute to it.
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              ConvexPi is a curriculum, an open-source research toolkit, and a community — all built
              around the same question: does a signal survive once the data is no longer yours to fit?
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                label: 'Learn',
                accent: '#0B1F3A',
                title: 'Read the field, honestly',
                desc: 'A simulation-first curriculum and a research library that is candid about which anomalies survive and which decayed after publication.',
                links: [
                  { t: 'Curriculum — 9 missions', href: '/curriculum', ext: false },
                  { t: 'Topic surveys', href: '/surveys', ext: false },
                  { t: 'Research papers + wikis', href: '/papers', ext: false },
                  { t: 'Anomaly graveyard', href: '/anomalies', ext: false },
                ],
                cta: { t: 'Begin Mission 1', href: '/getting-started', ext: false },
              },
              {
                label: 'Experiment',
                accent: '#C9A34E',
                title: 'Run it — or compete',
                desc: 'Recompute strategies in your browser, test them on a hidden holdout, and pit live agents against each other in a simulated market.',
                links: [
                  { t: 'Playground (runs in-browser)', href: '/playground', ext: false },
                  { t: 'Open competitions', href: '/compete', ext: false },
                  { t: 'Agent arena', href: '/agents', ext: false },
                ],
                cta: { t: 'Open the playground', href: '/playground', ext: false },
              },
              {
                label: 'Contribute',
                accent: '#15803d',
                title: 'Improve the commons',
                desc: 'Everything is open: edit a paper wiki, submit a strategy replication by pull request, or build on the packages that power the platform.',
                links: [
                  { t: 'Replication library', href: '/replications', ext: false },
                  { t: 'Edit a paper wiki', href: '/papers', ext: false },
                  { t: 'All repos on GitHub', href: ORG, ext: true },
                ],
                cta: { t: 'Contribute on GitHub', href: ORG, ext: true },
              },
            ].map(p => (
              <div key={p.label}
                className="flex flex-col gap-4 p-6 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-2"
                    style={{ color: p.accent }}>{p.label}</p>
                  <h3 className="text-base font-semibold text-foreground mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{p.desc}</p>
                  <div className="flex flex-col divide-y divide-border border-t border-border">
                    {p.links.map(l => (
                      l.ext ? (
                        <a key={l.t} href={l.href} target="_blank" rel="noopener noreferrer"
                          className="py-2 text-sm text-foreground hover:text-primary transition-colors">
                          {l.t} ↗
                        </a>
                      ) : (
                        <Link key={l.t} href={l.href}
                          className="py-2 text-sm text-foreground hover:text-primary transition-colors">
                          {l.t}
                        </Link>
                      )
                    ))}
                  </div>
                </div>
                <div className="mt-auto pt-1">
                  {p.cta.ext ? (
                    <a href={p.cta.href} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-semibold transition-colors hover:opacity-70" style={{ color: p.accent }}>
                      {p.cta.t} →
                    </a>
                  ) : (
                    <Link href={p.cta.href}
                      className="text-xs font-semibold transition-colors hover:opacity-70" style={{ color: p.accent }}>
                      {p.cta.t} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured projects ─────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="border-b border-border">
          <div className="container mx-auto px-4 py-16">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-2">Community showcase</p>
                <h2 className="font-serif text-3xl text-foreground">Featured projects</h2>
                <p className="text-muted-foreground mt-1">Strategy write-ups published from GitHub, run and graded by ConvexPi.</p>
              </div>
              <Link href="/projects" className="text-sm text-[#C9A34E] hover:text-[#b8922d] font-medium shrink-0">All projects →</Link>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {featured.map(p => {
                const a = fBy.get(p.author_id)
                return (
                  <Link key={p.slug} href={`/projects/${p.slug}`}
                    className="rounded-xl border border-[#C9A34E]/40 ring-1 ring-[#C9A34E]/10 bg-card p-5 hover:bg-secondary/40 transition-colors flex flex-col">
                    <h3 className="font-medium text-foreground leading-snug mb-1"><span className="text-[#C9A34E] mr-1">★</span>{p.title}</h3>
                    {p.summary && <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{p.summary}</p>}
                    <div className="mt-auto flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <span>{a?.display_name || (a?.username ? `@${a.username}` : 'ConvexPi')}</span>
                      {p.has_strategy && <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">strategy</span>}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

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

      {/* ── Research & replication (flagship) ─────────────────────────── */}
      {anomalies.length > 0 && (() => {
        const frenchFactors = anomalies.filter(a => !a.source || a.source === 'french')
        const osapCount = anomalies.filter(a => a.source === 'osap').length
        return (
          <section className="border-b border-border bg-secondary/40">
            <div className="container mx-auto px-4 py-20">
              <div className="max-w-3xl mb-10">
                <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-4">
                  Research &amp; Replication
                </p>
                <h2 className="font-serif text-3xl text-foreground mb-4">
                  The factor zoo is a graveyard.
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We track {anomalies.length} equity anomalies pre- and post-publication using the{' '}
                  <Link href="/anomalies" className="underline underline-offset-4 hover:text-foreground">
                    Open Source Asset Pricing
                  </Link>{' '}
                  dataset ({osapCount} predictors, 1926–2024) plus Kenneth French&apos;s flagship factors —
                  alongside a library of thousands of finance papers with structured wikis, and an open
                  package of <Link href="/replications"
                    className="underline underline-offset-4 hover:text-foreground">reference replications</Link>{' '}
                  that recompute each strategy and score it out of sample. Most anomalies are real
                  <em> in-sample</em> — then fade <em>out of sample</em> as the world catches on. A
                  few survive; many decay. That gap is the whole point.
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
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                <Link href="/anomalies"
                  className="text-sm font-medium text-[#C9A34E] hover:text-[#b8922d] transition-colors">
                  All {anomalies.length} anomalies →
                </Link>
                <Link href="/papers"
                  className="text-sm font-medium text-[#C9A34E] hover:text-[#b8922d] transition-colors">
                  Research papers + wikis →
                </Link>
                <Link href="/replications"
                  className="text-sm font-medium text-[#C9A34E] hover:text-[#b8922d] transition-colors">
                  Reference replications →
                </Link>
              </div>
            </div>
          </section>
        )
      })()}

      {/* ── Open-source ecosystem ─────────────────────────────────────── */}
      <section className="border-b border-border bg-[#0B1F3A] text-white">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold tracking-[0.15em] text-white/50 uppercase mb-4">
              Open Source
            </p>
            <h2 className="font-serif text-3xl mb-4 leading-snug">
              ConvexPi is not just a website. It&apos;s an open stack.
            </h2>
            <p className="text-white/70 leading-relaxed">
              The same tools that power the curriculum — synthetic markets, walk-forward backtests,
              hidden-holdout grading, replication, and a live exchange simulator — are open-source.
              Inspect the machinery, run it yourself, or extend it.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { repo: 'lab', desc: 'Synthetic equity panels, walk-forward backtests, hidden-holdout grading, anomaly replication, real-data mode.' },
              { repo: 'arena', desc: 'Discrete-time limit-order-book simulator for deploying live trading and market-making agents.' },
              { repo: 'replications', desc: 'Verified reference replications of canonical strategies — recomputed from building blocks, scored out of sample, CI-checked.' },
              { repo: 'content', desc: 'Community-edited paper wikis and research notes — anyone can suggest an edit via GitHub.' },
              { repo: 'missions', desc: 'The mission notebooks and assignments behind the curriculum.' },
              { repo: 'platform', desc: 'The web application, grader, and research library that runs convexpi.ai.' },
            ].map(r => (
              <a key={r.repo} href={`${ORG}/${r.repo}`} target="_blank" rel="noopener noreferrer"
                className="group flex flex-col gap-2 p-5 rounded-lg border border-white/15 bg-white/[0.03] hover:bg-white/[0.07] transition-colors">
                <div className="flex items-center gap-2">
                  <GitHubIcon className="w-3.5 h-3.5 text-white/60" />
                  <code className="text-sm font-mono text-white">convexpi/{r.repo}</code>
                  <span className="ml-auto text-white/40 group-hover:text-white/80 transition-colors">↗</span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">{r.desc}</p>
              </a>
            ))}
          </div>
          <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <code className="text-sm font-mono bg-white/10 text-white/90 px-3 py-1.5 rounded">
              pip install convexpi-lab
            </code>
            <a href={ORG} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors">
              <GitHubIcon className="w-4 h-4" /> Browse the GitHub organization →
            </a>
          </div>
        </div>
      </section>

      {/* ── Experiment environments ───────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-xl mb-12">
            <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-4">
              Experiment
            </p>
            <h2 className="font-serif text-3xl text-foreground">
              From a browser tab to a live market.
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              Three ways to put a strategy to the test — each grading the same question.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                label: 'Playground',
                accentColor: '#C9A34E',
                title: 'Run it in your browser',
                desc: 'Recompute real strategies — reconstruct the Fama-French factors from their building blocks, form a long-short book — entirely client-side, then test out of sample. No install.',
                bullets: [
                  'Python in the browser via Pyodide',
                  'Recomputes strategies, not finished factors',
                  'Open in Colab for full, live-data runs',
                ],
                href: '/playground',
                cta: 'Open the playground',
              },
              {
                label: 'Lab',
                accentColor: '#0B1F3A',
                title: 'Alpha Discovery Lab',
                desc: 'Write strategies against a synthetic equity panel with planted factor signals. Nine structured missions take you from naive overfitting to disciplined out-of-sample evaluation, with electives on microstructure and trading costs.',
                bullets: [
                  'Python-native (pandas, numpy, scikit-learn)',
                  'IS / OOS breakdown on every submission',
                  'Hidden-holdout grading you cannot game',
                ],
                href: '/getting-started',
                cta: 'Begin Mission 1',
              },
              {
                label: 'Arena',
                accentColor: '#15803d',
                title: 'Live Market Arena',
                desc: 'Deploy agents that submit live orders into a limit-order-book simulation. Study adverse selection, inventory risk, and spread dynamics under competitive pressure.',
                bullets: [
                  'WebSocket agent API — connect in Python',
                  'Ongoing open ladder + rolling seasons',
                  'Survival score rewards robustness over Sharpe',
                ],
                href: '/compete',
                cta: 'Browse open competitions',
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

      {/* ── Worked example: leaderboard ───────────────────────────────── */}
      {demoLeaderboard.length > 0 && (
        <section className="border-b border-border bg-secondary/40">
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

      {/* ── Contribute / community ────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-4">
              Contribute
            </p>
            <h2 className="font-serif text-3xl text-foreground mb-4 leading-snug">
              Built in the open, improved together.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Finance education usually hides the grader, the data, and the benchmark. ConvexPi does
              the opposite — and invites you to make it better. Every wiki, replication, and result is
              public and editable.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: 'Edit a paper wiki',
                desc: 'Every paper page has a structured, community-maintained wiki. Suggest an edit on GitHub — the revision history is a Wikipedia-style log.',
                cta: 'Browse papers', href: '/papers', ext: false,
              },
              {
                title: 'Submit a replication',
                desc: 'Add a strategy to the open replication library. Recompute it from building blocks, score it out of sample; CI checks it reproduces, then a maintainer merges your PR.',
                cta: 'Contribution guide', href: `${ORG}/replications/blob/main/CONTRIBUTING.md`, ext: true,
              },
              {
                title: 'Enter a competition',
                desc: 'An ongoing open ladder and rolling monthly seasons. Submit a strategy or a live agent and see your honest out-of-sample result on the public leaderboard.',
                cta: 'Open competitions', href: '/compete', ext: false,
              },
              {
                title: 'Build on the packages',
                desc: 'The Lab, Arena, and replication toolkits are MIT-licensed. Use them in your own research or course, and send improvements upstream.',
                cta: 'GitHub organization', href: ORG, ext: true,
              },
              {
                title: 'Earn reputation',
                desc: 'Replications, wiki edits, and strategies that survive out of sample earn reputation and badges — including Ghostbuster, for replicating a factor that turned out dead. Climb the contributors leaderboard.',
                cta: 'Contributors leaderboard', href: '/contributors', ext: false,
              },
              {
                title: 'Teach with it',
                desc: 'Run a private cohort: assign missions as problem sets, grade on hidden-holdout Sharpe, and export gradebooks. A University of Cincinnati cohort runs in Fall 2026.',
                cta: 'Create a cohort', href: '/classroom/new', ext: false,
              },
            ].map(c => (
              <div key={c.title} className="flex flex-col gap-2 p-5 rounded-lg border border-border bg-card/40">
                <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1">{c.desc}</p>
                {c.ext ? (
                  <a href={c.href} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-semibold text-[#C9A34E] hover:text-[#b8922d] transition-colors mt-1">
                    {c.cta} ↗
                  </a>
                ) : (
                  <Link href={c.href}
                    className="text-xs font-semibold text-[#C9A34E] hover:text-[#b8922d] transition-colors mt-1">
                    {c.cta} →
                  </Link>
                )}
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
              Start a mission, run the code, or contribute.
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Whether you want to learn quantitative finance, test a signal of your own, or help build
              an open research commons — there is a door for you. Mission 1 takes about thirty minutes.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/getting-started">
                <Button size="lg"
                  className="bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-medium px-8">
                  Begin Mission 1
                </Button>
              </Link>
              <Link href="/playground">
                <Button size="lg" variant="outline" className="font-medium px-8">
                  Run the playground
                </Button>
              </Link>
              <a href={ORG} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="font-medium px-8 gap-2">
                  <GitHubIcon className="w-4 h-4" />
                  Contribute on GitHub
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
