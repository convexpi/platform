import { readFileSync } from 'fs'
import { join } from 'path'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { Anomaly } from '../anomaly-list'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface StatsFile {
  updated_at: string
  anomalies: Anomaly[]
}

function loadStats(): StatsFile {
  const p = join(process.cwd(), 'public', 'anomaly-stats.json')
  try {
    return JSON.parse(readFileSync(p, 'utf-8'))
  } catch {
    return { updated_at: '', anomalies: [] }
  }
}

function getAnomaly(slug: string): Anomaly | undefined {
  const { anomalies } = loadStats()
  return anomalies.find(a => (a.slug ?? a.id) === slug)
}

// ---------------------------------------------------------------------------
// Static params — pre-render all factor pages at build time
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  const { anomalies } = loadStats()
  return anomalies.map(a => ({ slug: a.slug ?? a.id }))
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const a = getAnomaly(slug)
  if (!a) return {}
  return {
    title: `${a.name} — Anomaly Graveyard | ConvexPi`,
    description: `${a.name}: IS Sharpe ${a.is_sharpe.toFixed(2)}, OOS Sharpe ${a.oos_sharpe.toFixed(2)}. ${a.description.slice(0, 140)}`,
  }
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    alive:        { label: '✓ alive',    cls: 'bg-green-100 text-green-800 border-green-200' },
    weakened:     { label: '⚠ weakened', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
    faded:        { label: '↓ faded',    cls: 'bg-orange-100 text-orange-800 border-orange-200' },
    dead:         { label: '✗ dead',     cls: 'bg-gray-100 text-gray-600 border-gray-200' },
    insufficient: { label: '~ n/a',      cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  }
  const { label, cls } = cfg[status] ?? cfg.faded
  return (
    <span className={`text-sm font-medium px-3 py-1 rounded-full border ${cls}`}>
      {label}
    </span>
  )
}

function Stat({
  label, value, sub, highlight,
}: { label: string; value: string; sub?: string; highlight?: 'green' | 'amber' | 'red' | 'none' }) {
  const color =
    highlight === 'green' ? 'text-green-600' :
    highlight === 'amber' ? 'text-amber-600' :
    highlight === 'red'   ? 'text-red-500'   : ''
  return (
    <div className="bg-muted/30 rounded-lg px-4 py-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`font-mono font-bold text-xl ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

function Sparkline({
  points, status,
}: { points: { date: string; cum_ret: number }[]; status: string }) {
  if (points.length < 2) return null
  const values = points.map(p => p.cum_ret)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 600; const H = 80
  const color =
    status === 'alive'    ? '#16a34a' :
    status === 'weakened' ? '#d97706' :
    status === 'faded'    ? '#ef4444' : '#6b7280'
  const pts = points.map((p, i) =>
    `${((i / (points.length - 1)) * W).toFixed(1)},${(H - ((p.cum_ret - min) / range) * H).toFixed(1)}`
  )
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
      {min < 0 && max > 0 && (
        <line
          x1="0" y1={H - (-min / range) * H}
          x2={W} y2={H - (-min / range) * H}
          stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const REPL_RAW = 'https://raw.githubusercontent.com/convexpi/replications/main/results.json'
const ANOMALY_TO_ACRONYM: Record<string, string> = { momentum: 'Mom12m' } // tracker slug -> OSAP acronym

type Repl = { name: string; title: string; osap_acronym: string | null; oos_sharpe: number; verdict: string }

async function findReplication(a: { osap_acronym?: string; slug?: string; id: string }): Promise<Repl | null> {
  try {
    const r = await fetch(REPL_RAW, { next: { revalidate: 3600 } })
    if (!r.ok) return null
    const reps = (await r.json()) as Repl[]
    const acr = a.osap_acronym ?? ANOMALY_TO_ACRONYM[a.slug ?? a.id]
    return acr ? (reps.find(x => x.osap_acronym === acr) ?? null) : null
  } catch {
    return null
  }
}

export default async function FactorPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const a = getAnomaly(slug)
  if (!a) notFound()

  const repMatch = await findReplication(a)
  const sparkline = a.monthly_returns ?? []
  const finalCumRet = sparkline.length > 0
    ? sparkline[sparkline.length - 1].cum_ret
    : null

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">

      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/anomalies" className="hover:text-foreground underline underline-offset-4">
          Anomaly Graveyard
        </Link>
        {' / '}
        <span className="text-foreground">{a.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{a.name}</h1>
          <StatusBadge status={a.status} />
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
          {a.osap_acronym && (
            <span className="font-mono bg-muted px-2 py-0.5 rounded">{a.osap_acronym}</span>
          )}
          {a.category && <span>{a.category}</span>}
          {a.data_category && <span>· {a.data_category} data</span>}
        </div>
        {a.description && (
          <p className="mt-4 text-muted-foreground leading-relaxed max-w-3xl">
            {a.description}
          </p>
        )}
      </div>

      {/* Runnable replication, when one exists */}
      {repMatch && (
        <div className="mb-8 rounded-lg border border-[#C9A34E]/30 bg-[#C9A34E]/5 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-foreground">
            A recomputed, out-of-sample-scored <strong>replication</strong> of this factor is available —
            verdict <span className="font-mono">{repMatch.verdict}</span>, OOS Sharpe {repMatch.oos_sharpe.toFixed(2)}.
          </p>
          <div className="flex gap-4 text-sm shrink-0">
            <Link href="/replications" className="font-medium text-[#C9A34E] hover:text-[#b8922d]">
              Replication leaderboard →
            </Link>
            <a href={`https://colab.research.google.com/github/convexpi/replications/blob/main/notebooks/${repMatch.name}.ipynb`}
              target="_blank" rel="noopener noreferrer"
              className="font-medium text-[#C9A34E] hover:text-[#b8922d]">Run in Colab ↗</a>
          </div>
        </div>
      )}

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat
          label={`IS Sharpe (${a.is_period})`}
          value={a.is_sharpe.toFixed(3)}
          sub={`${a.is_return > 0 ? '+' : ''}${a.is_return.toFixed(1)}% p.a.`}
          highlight={a.is_sharpe > 0.5 ? 'green' : a.is_sharpe > 0.2 ? 'amber' : 'none'}
        />
        <Stat
          label={`OOS Sharpe (${a.oos_period})`}
          value={a.oos_sharpe.toFixed(3)}
          sub={`${a.oos_return > 0 ? '+' : ''}${a.oos_return.toFixed(1)}% p.a.`}
          highlight={a.oos_sharpe > 0.5 ? 'green' : a.oos_sharpe > 0.2 ? 'amber' : a.oos_sharpe > 0 ? 'none' : 'red'}
        />
        <Stat
          label="Sharpe decay"
          value={`${a.decay_pct > 0 ? '+' : ''}${a.decay_pct.toFixed(1)}%`}
          sub="(IS − OOS) / |IS|"
          highlight={a.decay_pct > 70 ? 'red' : a.decay_pct > 40 ? 'amber' : 'green'}
        />
        <Stat
          label="IS vol"
          value={`${a.is_vol.toFixed(1)}%`}
          sub="annualized"
        />
      </div>

      {/* Sparkline */}
      {sparkline.length > 1 && (
        <div className="border rounded-lg p-4 mb-8">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-medium">Cumulative return (last 40 years, monthly)</p>
            {finalCumRet != null && (
              <span className={`text-sm font-mono font-semibold ${finalCumRet >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {finalCumRet >= 0 ? '+' : ''}{(finalCumRet * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <Sparkline points={sparkline} status={a.status} />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{sparkline[0].date}</span>
            <span>{sparkline[sparkline.length - 1].date}</span>
          </div>
        </div>
      )}

      {/* Paper metadata */}
      <div className="border rounded-lg divide-y mb-8">
        <h2 className="text-sm font-semibold px-4 py-3 bg-muted/30">Publication details</h2>
        {[
          ['Authors', a.authors || null],
          ['Paper', a.paper],
          ['Journal', a.journal_full ?? a.journal ?? null],
          ['Publication year', a.pub_year?.toString() ?? null],
          ['Original sample', a.original_sample || null],
          ['IS T-statistic', a.t_stat != null ? a.t_stat.toFixed(2) : null],
        ].filter(([, v]) => v != null).map(([label, value]) => (
          <div key={label as string} className="flex px-4 py-2.5 text-sm gap-4">
            <span className="text-muted-foreground w-36 shrink-0">{label}</span>
            <span className="font-medium">{value as string}</span>
          </div>
        ))}
      </div>

      {/* Related anomalies in same category */}
      {a.category && (() => {
        const related = loadStats().anomalies
          .filter(r => r.category === a.category && (r.slug ?? r.id) !== slug)
          .sort((x, y) => Math.abs(y.oos_sharpe) - Math.abs(x.oos_sharpe))
          .slice(0, 6)
        if (!related.length) return null
        return (
          <div className="border rounded-lg p-4 mb-8">
            <h2 className="text-sm font-semibold mb-3">
              More {a.category} anomalies
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {related.map(r => {
                const rs = r.slug ?? r.id
                return (
                  <Link
                    key={r.id}
                    href={`/anomalies/${rs}`}
                    className="flex items-center justify-between px-3 py-2 rounded-md
                               hover:bg-muted/50 border border-transparent hover:border-border
                               transition-colors text-sm"
                  >
                    <span className="font-medium truncate mr-3">{r.name}</span>
                    <span className={`font-mono text-xs shrink-0 ${
                      r.oos_sharpe > 0.5 ? 'text-green-600' :
                      r.oos_sharpe > 0.2 ? 'text-amber-600' :
                      r.oos_sharpe > 0   ? 'text-muted-foreground' : 'text-red-500'
                    }`}>
                      {r.oos_sharpe >= 0 ? '+' : ''}{r.oos_sharpe.toFixed(2)}
                    </span>
                  </Link>
                )
              })}
            </div>
            <Link
              href={`/anomalies?cat=${encodeURIComponent(a.category)}`}
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground mt-3 inline-block"
            >
              See all {a.category} anomalies →
            </Link>
          </div>
        )
      })()}

      {/* Back link */}
      <Link
        href="/anomalies"
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        ← Back to Anomaly Graveyard
      </Link>

    </div>
  )
}
