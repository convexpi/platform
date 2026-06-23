import type { Metadata } from 'next'
import Link from 'next/link'
import { Playground } from './playground-client'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Playground — ConvexPi',
  description:
    'Run real factor strategies in your browser on Ken-French data, and test out of sample whether the published edge survived.',
}

type Result = { name: string; title: string; oos_sharpe: number; verdict: string }

const VERDICT_STYLE: Record<string, string> = {
  alive: 'bg-emerald-100 text-emerald-700',
  decayed: 'bg-amber-100 text-amber-700',
  dormant: 'bg-red-100 text-red-600',
  weak: 'bg-slate-100 text-slate-600',
}

async function loadResults(): Promise<Result[]> {
  try {
    const r = await fetch('https://raw.githubusercontent.com/convexpi/replications/main/results.json',
      { next: { revalidate: 3600 } })
    if (!r.ok) return []
    return (await r.json()) as Result[]
  } catch {
    return []
  }
}

export default async function PlaygroundPage() {
  const featured = (await loadResults()).slice(0, 6)
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Playground</h1>
        <p className="text-muted-foreground leading-relaxed">
          Real strategy replications, executed in your browser. Each example <em>recomputes</em> the
          strategy from its building blocks — reconstructing the Fama-French factors from the
          underlying size/value/momentum portfolios, or forming a long-short book by ranking
          industries each month — rather than reading a finished factor off the shelf. It checks the
          reconstruction against the published series, then splits at the paper&apos;s publication
          year (the McLean &amp; Pontiff test) to ask: <em>did the edge survive out of sample?</em>
        </p>
      </div>
      <Playground />
      <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
        Everything runs client-side via Pyodide on real Ken-French data — edit the code and re-run.
        For a full end-to-end replication on freshly downloaded data (including true single-name
        cross-sectional strategies), use the <strong>Open in Colab</strong> link on each example.
      </p>

      {featured.length > 0 && (
        <div className="mt-10 rounded-lg border border-border bg-secondary/40 p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
              From the replication leaderboard
            </p>
            <Link href="/replications"
              className="text-xs font-medium text-[#C9A34E] hover:text-[#b8922d] transition-colors">
              See all →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {featured.map(r => (
              <div key={r.name}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
                <span className="text-sm text-foreground truncate">{r.title}</span>
                <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${VERDICT_STYLE[r.verdict] ?? 'bg-slate-100 text-slate-600'}`}>
                  {r.verdict}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Verified, out-of-sample-scored replications of canonical strategies — runnable in Colab,
            open to your <Link href="/replications" className="underline underline-offset-4 hover:text-foreground">contributions</Link>.
          </p>
        </div>
      )}
    </div>
  )
}
