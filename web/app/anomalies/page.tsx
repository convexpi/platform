import { readFileSync } from 'fs'
import { join } from 'path'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Anomaly Graveyard — ConvexPi' }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MonthlyPoint {
  date: string
  cum_ret: number
}

interface Anomaly {
  id: string
  name: string
  factor: string
  paper: string
  pub_year: number
  description: string
  is_period: string
  oos_period: string
  is_return: number
  is_sharpe: number
  is_vol: number
  oos_return: number
  oos_sharpe: number
  oos_vol: number
  decay_pct: number
  status: 'alive' | 'weakened' | 'faded' | 'dead'
  monthly_returns: MonthlyPoint[]
}

interface StatsFile {
  updated_at: string
  source: string
  anomalies: Anomaly[]
}

// ---------------------------------------------------------------------------
// Data loading — read the pre-computed JSON at build / request time
// ---------------------------------------------------------------------------

function loadStats(): StatsFile {
  const p = join(process.cwd(), 'public', 'anomaly-stats.json')
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as StatsFile
  } catch {
    return { updated_at: '', source: '', anomalies: [] }
  }
}

// ---------------------------------------------------------------------------
// Sparkline SVG (server-rendered, no JS)
// ---------------------------------------------------------------------------

function Sparkline({ points, status }: { points: MonthlyPoint[]; status: string }) {
  if (points.length < 2) {
    return <div className="h-12 flex items-center text-xs text-muted-foreground">No data</div>
  }

  const values = points.map(p => p.cum_ret)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const W = 200
  const H = 48

  const pts = points.map((p, i) => {
    const x = (i / (points.length - 1)) * W
    const y = H - ((p.cum_ret - min) / range) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const color =
    status === 'alive'    ? '#16a34a' :
    status === 'weakened' ? '#d97706' :
    status === 'faded'    ? '#ef4444' :
                            '#6b7280'

  const last = values[values.length - 1]
  const labelY = H - ((last - min) / range) * H

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      {/* Zero line */}
      {min < 0 && max > 0 && (
        <line
          x1="0" y1={H - (-min / range) * H}
          x2={W} y2={H - (-min / range) * H}
          stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 2"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    alive:    { label: '✓ alive',    className: 'bg-green-100 text-green-800 border-green-200' },
    weakened: { label: '⚠ weakened', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    faded:    { label: '↓ faded',    className: 'bg-orange-100 text-orange-800 border-orange-200' },
    dead:     { label: '✗ dead',     className: 'bg-gray-100 text-gray-600 border-gray-200' },
  }
  const { label, className } = config[status] ?? config.faded
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${className}`}>
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Stat cell
// ---------------------------------------------------------------------------

function Stat({
  label, value, sub, highlight,
}: {
  label: string; value: string; sub?: string; highlight?: 'green' | 'red' | 'amber' | 'none'
}) {
  const color =
    highlight === 'green' ? 'text-green-600' :
    highlight === 'red'   ? 'text-red-600' :
    highlight === 'amber' ? 'text-amber-600' :
                            ''
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-mono font-semibold text-sm ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnomalyGraveyardPage() {
  const data = loadStats()
  const anomalies = data.anomalies

  const updatedAt = data.updated_at
    ? new Date(data.updated_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Anomaly Graveyard</h1>
        <p className="text-muted-foreground max-w-2xl">
          Canonical equity factor anomalies, measured pre- and post-publication.
          Published factors attract capital that arbitrages away their returns —
          the McLean-Pontiff (2016) effect. All data from the{' '}
          <a
            href="https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Kenneth French Data Library
          </a>
          . No licensed data required.
        </p>

        <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">Pre-pub Sharpe</strong>{' '}
            — annualized Sharpe in the original authors&apos; sample
          </span>
          <span>
            <strong className="text-foreground">Post-pub Sharpe</strong>{' '}
            — live performance since publication year
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4">
          {[
            { status: 'alive',    desc: '≥ 0.5 post-pub Sharpe' },
            { status: 'weakened', desc: '0.2 – 0.5' },
            { status: 'faded',    desc: '0 – 0.2' },
            { status: 'dead',     desc: '≤ 0' },
          ].map(({ status, desc }) => (
            <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <StatusBadge status={status} />
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-6">
        {anomalies.map(a => (
          <Card key={a.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <CardTitle className="text-lg">{a.name}</CardTitle>
                    <StatusBadge status={a.status} />
                    <Badge variant="outline" className="text-xs font-mono">{a.factor}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.paper}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Publication</p>
                  <p className="font-semibold">{a.pub_year}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {a.description}
              </p>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 border-y">
                <Stat
                  label={`Pre-pub Sharpe (${a.is_period})`}
                  value={a.is_sharpe.toFixed(3)}
                  highlight={a.is_sharpe > 0.5 ? 'green' : a.is_sharpe > 0.2 ? 'amber' : 'none'}
                />
                <Stat
                  label={`Post-pub Sharpe (${a.oos_period})`}
                  value={a.oos_sharpe.toFixed(3)}
                  highlight={
                    a.oos_sharpe > 0.5 ? 'green' :
                    a.oos_sharpe > 0.2 ? 'amber' :
                    a.oos_sharpe > 0   ? 'none' : 'red'
                  }
                />
                <Stat
                  label="Sharpe decay"
                  value={`${a.decay_pct > 0 ? '+' : ''}${a.decay_pct.toFixed(1)}%`}
                  highlight={a.decay_pct > 50 ? 'red' : a.decay_pct > 20 ? 'amber' : 'green'}
                />
                <Stat
                  label="Post-pub return"
                  value={`${a.oos_return > 0 ? '+' : ''}${a.oos_return.toFixed(1)}% p.a.`}
                  highlight={a.oos_return > 3 ? 'green' : a.oos_return > 0 ? 'none' : 'red'}
                />
              </div>

              {/* Sparkline */}
              {a.monthly_returns.length > 1 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Cumulative return (last 40 years, monthly)
                  </p>
                  <Sparkline points={a.monthly_returns} status={a.status} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                    <span>{a.monthly_returns[0]?.date}</span>
                    <span>{a.monthly_returns[a.monthly_returns.length - 1]?.date}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 text-xs text-muted-foreground space-y-1 border-t pt-6">
        <p>
          <strong>Source:</strong>{' '}
          <a
            href="https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            Kenneth French Data Library
          </a>
          {' '}— freely available for academic use.
        </p>
        <p>
          Sharpe ratio: annualized mean daily return divided by annualized daily vol.
          Pre-publication period ends the year before the paper appeared.
        </p>
        {updatedAt && <p>Data last refreshed: {updatedAt}.</p>}
        <p>
          <strong>Not financial advice.</strong> Factor returns are gross of transaction
          costs, taxes, and capacity constraints. Past factor performance does not
          guarantee future results.
        </p>
      </div>

    </div>
  )
}
