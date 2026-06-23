import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Replications — ConvexPi',
  description:
    'An open, verified library of canonical strategy replications — each recomputed from building blocks and scored out of sample. Run any of them in Colab, read the code, and contribute your own.',
}

const REPO = 'https://github.com/convexpi/replications'
const RAW = 'https://raw.githubusercontent.com/convexpi/replications/main/results.json'

type Result = {
  name: string
  title: string
  paper_title: string
  paper_doi: string | null
  pub_year: number
  in_sample_sharpe: number | null
  oos_sharpe: number
  recent_sharpe: number
  sharpe_decay: number | null
  turnover: number | null
  net_oos_sharpe: number | null
  caveat: string | null
  verdict: string
}

async function loadResults(): Promise<Result[]> {
  try {
    const r = await fetch(RAW, { next: { revalidate: 3600 } })
    if (!r.ok) return []
    return (await r.json()) as Result[]
  } catch {
    return []
  }
}

const VERDICT_STYLE: Record<string, string> = {
  alive: 'bg-emerald-100 text-emerald-700',
  decayed: 'bg-amber-100 text-amber-700',
  dormant: 'bg-red-100 text-red-600',
  weak: 'bg-slate-100 text-slate-600',
}

function fmt(x: number | null, sign = false): string {
  if (x === null || x === undefined || Number.isNaN(x)) return '—'
  return sign ? (x >= 0 ? `+${x.toFixed(2)}` : x.toFixed(2)) : x.toFixed(2)
}

export default async function ReplicationsPage() {
  const results = await loadResults()

  // Resolve each paper DOI to its on-site wiki id so we can link to it.
  const dois = results.map(r => r.paper_doi).filter(Boolean) as string[]
  const doiToId: Record<string, string> = {}
  if (dois.length) {
    const db = await createClient()
    const { data } = await db.from('papers').select('id, doi').in('doi', dois)
    for (const row of (data ?? []) as { id: string; doi: string }[]) {
      if (row.doi) doiToId[row.doi] = row.id
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      {/* Header */}
      <div className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-3">
          Open Replication Library
        </p>
        <h1 className="font-serif text-4xl text-foreground mb-4 leading-tight">
          Which strategies survive out of sample?
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Each strategy below is <em>recomputed from its building blocks</em> — reconstructing the
          Fama-French factors from their component portfolios, forming long-short books by ranking
          assets — never read off a finished factor. Then it is scored honestly out of sample by
          splitting at the paper&apos;s publication year (the McLean &amp; Pontiff test). The library is{' '}
          <a href={REPO} target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground">open source</a>: every
          result is reproduced by CI, runnable in Colab, and open to your contributions.
        </p>
      </div>

      {results.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
          Couldn&apos;t load the leaderboard right now. View it on{' '}
          <a href={REPO} target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground">GitHub</a>.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-secondary border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">Strategy</th>
                <th className="text-right px-4 py-3 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">Pub.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">IS</th>
                <th className="text-right px-4 py-3 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">OOS</th>
                <th className="text-right px-4 py-3 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">Decay</th>
                <th className="text-right px-4 py-3 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">Verdict</th>
                <th className="text-right px-4 py-3 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">Run</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {results.map(r => {
                const wikiId = r.paper_doi ? doiToId[r.paper_doi] : undefined
                const colab = `https://colab.research.google.com/github/convexpi/replications/blob/main/notebooks/${r.name}.ipynb`
                const code = `${REPO}/blob/main/replications/catalog/${r.name}.py`
                const decay = r.sharpe_decay
                return (
                  <tr key={r.name} className="hover:bg-secondary/40 transition-colors align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{r.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {wikiId ? (
                          <Link href={`/papers/${wikiId}`} className="hover:underline underline-offset-4">
                            {r.paper_title}
                          </Link>
                        ) : r.paper_doi ? (
                          <a href={`https://doi.org/${r.paper_doi}`} target="_blank" rel="noopener noreferrer"
                            className="hover:underline underline-offset-4">
                            {r.paper_title}
                          </a>
                        ) : r.paper_title}
                      </div>
                      {r.caveat && (
                        <div className="text-[11px] text-amber-600 mt-1 leading-snug max-w-md">
                          ⚠ {r.caveat}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{r.pub_year}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{fmt(r.in_sample_sharpe)}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${
                      r.oos_sharpe >= 0.3 ? 'text-emerald-600' : r.oos_sharpe >= 0 ? 'text-amber-600' : 'text-red-500'
                    }`}>{fmt(r.oos_sharpe, true)}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {decay === null || decay === undefined ? '—' : decay < 0 ? 'improved' : `${Math.round(decay * 100)}%`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${VERDICT_STYLE[r.verdict] ?? 'bg-slate-100 text-slate-600'}`}>
                        {r.verdict}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <a href={colab} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#C9A34E] hover:text-[#b8922d] font-medium">Colab</a>
                      <span className="text-border mx-1.5">·</span>
                      <a href={code} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground">code</a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes + contribute */}
      <div className="mt-6 text-xs text-muted-foreground leading-relaxed space-y-1">
        <p>
          <strong className="text-foreground">IS</strong> / <strong className="text-foreground">OOS</strong> are
          annualized Sharpe ratios in-sample (pre-publication) and out-of-sample (post-publication);
          <strong className="text-foreground"> Decay</strong> is the fraction of in-sample Sharpe lost
          after publication. Verdicts fall out of the numbers, not editorial judgement.
        </p>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-secondary/40 px-6 py-6">
        <h2 className="font-serif text-xl text-foreground mb-2">Add your own replication</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-2xl">
          Recompute a strategy from building blocks, score it out of sample, and open a pull request.
          CI checks the contract and that your result reproduces; a maintainer merges it. Multiple takes
          on the same paper are welcome — the disagreement is the lesson.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <a href={`${REPO}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noopener noreferrer"
            className="font-medium text-[#C9A34E] hover:text-[#b8922d]">Contribution guide ↗</a>
          <a href={REPO} target="_blank" rel="noopener noreferrer"
            className="font-medium text-[#C9A34E] hover:text-[#b8922d]">convexpi/replications ↗</a>
          <Link href="/playground" className="font-medium text-[#C9A34E] hover:text-[#b8922d]">Try the playground →</Link>
        </div>
      </div>
    </div>
  )
}
