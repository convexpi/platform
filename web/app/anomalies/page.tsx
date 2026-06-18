import { readFileSync } from 'fs'
import { join } from 'path'
import { Suspense } from 'react'
import { AnomalyList, type Anomaly } from './anomaly-list'

export const metadata = {
  title: 'Anomaly Graveyard — ConvexPi',
  description:
    '212 equity factor anomalies measured pre- and post-publication using Open Source Asset Pricing data.',
}

interface StatsFile {
  updated_at: string
  source: string
  anomalies: Anomaly[]
}

function loadStats(): StatsFile {
  const p = join(process.cwd(), 'public', 'anomaly-stats.json')
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as StatsFile
  } catch {
    return { updated_at: '', source: '', anomalies: [] }
  }
}

export default function AnomalyGraveyardPage() {
  const data = loadStats()
  const { updated_at } = data
  // Strip monthly_returns — they're only needed on individual factor pages, not the table.
  // Omitting them here keeps the React serialization payload under ~200 KB.
  const anomalies = data.anomalies.map(
    ({ monthly_returns: _mr, description: _d, long_description: _ld, ...rest }) => rest
  ) as Anomaly[]

  const updatedAt = updated_at
    ? new Date(updated_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  const osapCount = anomalies.filter(a => a.source === 'osap').length
  const frenchCount = anomalies.filter(a => !a.source || a.source === 'french').length

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-3">Anomaly Graveyard</h1>
        <p className="text-muted-foreground max-w-3xl leading-relaxed">
          {anomalies.length} equity factor anomalies tracked pre- and post-publication using the{' '}
          <a
            href="https://www.openassetpricing.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Open Source Asset Pricing
          </a>{' '}
          dataset (Chen &amp; Zimmermann 2022) plus the{' '}
          <a
            href="https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Kenneth French Data Library
          </a>
          . Published factors attract capital that arbitrages away their returns —
          the McLean-Pontiff (2016) effect. All data is freely available; no licensed sources required.
        </p>

        {/* Data source pill row */}
        <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
          {frenchCount > 0 && (
            <span className="border rounded-full px-3 py-1">
              {frenchCount} Kenneth French flagship factors
            </span>
          )}
          {osapCount > 0 && (
            <span className="border rounded-full px-3 py-1">
              {osapCount} OSAP predictors (1926 – 2024)
            </span>
          )}
          {updatedAt && (
            <span className="border rounded-full px-3 py-1">
              Updated {updatedAt}
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-5 text-xs text-muted-foreground">
          {[
            ['alive',    '≥ 0.5 OOS Sharpe',  'bg-green-100 text-green-800 border-green-200'],
            ['weakened', '0.2 – 0.5',          'bg-amber-100 text-amber-800 border-amber-200'],
            ['faded',    '0 – 0.2',            'bg-orange-100 text-orange-800 border-orange-200'],
            ['dead',     '≤ 0',                'bg-gray-100 text-gray-600 border-gray-200'],
          ].map(([s, desc, cls]) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>
                {s === 'alive' ? '✓' : s === 'weakened' ? '⚠' : s === 'faded' ? '↓' : '✗'} {s}
              </span>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive anomaly list */}
      <Suspense fallback={<div className="py-8 text-sm text-muted-foreground text-center">Loading…</div>}>
        <AnomalyList anomalies={anomalies} />
      </Suspense>

      {/* Footer */}
      <div className="mt-12 text-xs text-muted-foreground space-y-2 border-t pt-6">
        <p>
          <strong>OSAP source:</strong>{' '}
          Chen, A. Y. &amp; Zimmermann, T. (2022).{' '}
          <em>Open Source Cross-Sectional Asset Pricing</em>.{' '}
          Critical Finance Review, 11(2), 207–264.{' '}
          <a
            href="https://www.openassetpricing.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            openassetpricing.com
          </a>
        </p>
        <p>
          Sharpe ratios are annualized from monthly long-short portfolio returns.
          IS (in-sample) = pre-publication period. OOS (out-of-sample) = post-publication period.
          Returns are gross of transaction costs and capacity constraints.
        </p>
        <p>
          <strong>Not financial advice.</strong> Past factor performance does not guarantee future results.
        </p>
      </div>

    </div>
  )
}
