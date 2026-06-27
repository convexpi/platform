import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How it fits together — ConvexPi',
  description: 'A map of ConvexPi: learn the empirical method, experiment against hidden holdouts and live markets, and contribute to an open research commons.',
}

type Item = { href: string; label: string; desc: string; ext?: boolean }
type Pillar = { tag: string; title: string; blurb: string; items: Item[] }

const PILLARS: Pillar[] = [
  {
    tag: 'Learn',
    title: 'Learn the method',
    blurb: 'Why out-of-sample is the only honest test — and the tools to find real signal.',
    items: [
      { href: '/getting-started', label: 'Get started', desc: 'The 30-minute on-ramp.' },
      { href: '/curriculum', label: 'Curriculum (6 missions)', desc: 'The core course: overfitting → alpha discovery.' },
      { href: 'https://github.com/convexpi/missions/tree/main/lectures', label: 'Lectures', desc: 'p-hacking, the Information Coefficient.', ext: true },
      { href: '/lessons/market-making', label: 'Market-making lesson', desc: 'Earn the spread; manage inventory & adverse selection.' },
      { href: '/exchange', label: 'How the exchange works', desc: 'The matching engine, in plain English.' },
      { href: '/exchange/realistic', label: 'The realistic exchange (L3)', desc: 'Queue position, latency, the cancel race.' },
      { href: '/glossary', label: 'Glossary', desc: 'OOS Sharpe, overfitting ratio, maker/taker, L2/L3…' },
    ],
  },
  {
    tag: 'Experiment',
    title: 'Experiment against reality',
    blurb: 'Test ideas on hidden holdouts and live markets. Reality is the final test set.',
    items: [
      { href: '/playground', label: 'Playground', desc: 'Run code in the browser, no setup.' },
      { href: '/compete', label: 'Competitions', desc: 'Submit strategies, connect agents, forecast — ranked out of sample.' },
      { href: '/compete/sp500-nextday', label: 'S&P next-day', desc: 'Predict tomorrow’s index move; scored live on real prices.' },
      { href: '/compete/arena-l3', label: 'Realistic exchange (L3)', desc: 'Trade a real order-by-order book with true queue position.' },
      { href: '/agents', label: 'Agent arena', desc: 'Write a trading agent for the live limit-order book.' },
    ],
  },
  {
    tag: 'Contribute',
    title: 'Contribute to the commons',
    blurb: 'Everything is open. Replicate the canon, publish your work, earn reputation.',
    items: [
      { href: '/replications', label: 'Replication library', desc: 'Canonical strategies, recomputed and scored OOS.' },
      { href: '/surveys', label: 'Topic surveys', desc: 'The literature on each anomaly, synthesized from the wikis.' },
      { href: '/projects', label: 'Projects showcase', desc: 'Publish a notebook from GitHub; we run, render, and rank it.' },
      { href: '/papers', label: 'Papers & wikis', desc: 'The finance-ML literature, summarized.' },
      { href: '/anomalies', label: 'Anomaly graveyard', desc: 'Which published edges actually survived.' },
      { href: '/contributors', label: 'Contributors', desc: 'The reputation leaderboard.' },
    ],
  },
]

export default function OverviewPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-5xl">
      <div className="mb-10 max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-3">The whole platform, one page</p>
        <h1 className="font-serif text-4xl text-foreground mb-4 leading-tight">How ConvexPi fits together</h1>
        <p className="text-muted-foreground leading-relaxed">
          An open platform for empirical finance, organized around three things you do:{' '}
          <strong className="text-foreground font-medium">learn</strong> the method,{' '}
          <strong className="text-foreground font-medium">experiment</strong> against hidden holdouts and live
          markets, and <strong className="text-foreground font-medium">contribute</strong> to a shared research commons.
        </p>
      </div>

      {/* Recommended path */}
      <div className="mb-12 rounded-xl border border-border bg-secondary/30 px-6 py-5">
        <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-3">New here? The path</p>
        <ol className="grid sm:grid-cols-3 gap-4 text-sm">
          <li><span className="text-[#C9A34E] font-semibold">1.</span> <Link href="/curriculum" className="underline underline-offset-4 hover:text-foreground">Run Mission 1</Link> — feel overfitting first-hand.</li>
          <li><span className="text-[#C9A34E] font-semibold">2.</span> <Link href="/compete" className="underline underline-offset-4 hover:text-foreground">Enter a competition</Link> — get scored on hidden data.</li>
          <li><span className="text-[#C9A34E] font-semibold">3.</span> <Link href="/projects" className="underline underline-offset-4 hover:text-foreground">Publish a project</Link> — share it; earn reputation.</li>
        </ol>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {PILLARS.map(p => (
          <section key={p.tag}>
            <p className="text-xs font-semibold tracking-[0.15em] text-[#C9A34E] uppercase mb-1">{p.tag}</p>
            <h2 className="font-serif text-xl text-foreground mb-1">{p.title}</h2>
            <p className="text-sm text-muted-foreground mb-4 leading-snug">{p.blurb}</p>
            <ul className="space-y-2.5">
              {p.items.map(it => (
                <li key={it.href}>
                  {it.ext ? (
                    <a href={it.href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-[#C9A34E]">{it.label} ↗</a>
                  ) : (
                    <Link href={it.href} className="text-sm font-medium text-foreground hover:text-[#C9A34E]">{it.label}</Link>
                  )}
                  <p className="text-xs text-muted-foreground leading-snug">{it.desc}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
