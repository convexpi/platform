'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Anomaly {
  id: string
  slug?: string
  name: string
  long_description?: string
  description: string
  source?: 'french' | 'osap' | 'manual'
  osap_acronym?: string
  category?: string
  data_category?: string
  authors?: string
  paper: string
  journal?: string
  journal_full?: string
  pub_year: number
  original_sample?: string
  t_stat?: number | null
  is_period: string
  oos_period: string
  is_return: number
  is_sharpe: number
  is_vol: number
  oos_return: number
  oos_sharpe: number
  oos_vol: number
  decay_pct: number
  status: 'alive' | 'weakened' | 'faded' | 'dead' | 'insufficient'
  monthly_returns?: { date: string; cum_ret: number }[]
}

// ---------------------------------------------------------------------------
// Status badge
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
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border whitespace-nowrap ${cls}`}>
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Category pill
// ---------------------------------------------------------------------------

const CAT_COLORS: Record<string, string> = {
  Momentum:     'bg-blue-100 text-blue-700',
  Reversal:     'bg-indigo-100 text-indigo-700',
  Value:        'bg-purple-100 text-purple-700',
  Quality:      'bg-teal-100 text-teal-700',
  Investment:   'bg-cyan-100 text-cyan-700',
  Risk:         'bg-red-100 text-red-700',
  Liquidity:    'bg-yellow-100 text-yellow-700',
  Financing:    'bg-pink-100 text-pink-700',
  Analyst:      'bg-violet-100 text-violet-700',
  Growth:       'bg-lime-100 text-lime-700',
  Microstructure: 'bg-slate-100 text-slate-700',
  Size:         'bg-orange-100 text-orange-700',
  Other:        'bg-gray-100 text-gray-600',
}

function CategoryPill({ category }: { category?: string }) {
  if (!category) return null
  const cls = CAT_COLORS[category] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${cls}`}>
      {category}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Sharpe coloring helper
// ---------------------------------------------------------------------------

function sharpeColor(v: number) {
  if (v > 0.5)  return 'text-green-600 font-semibold'
  if (v > 0.2)  return 'text-amber-600'
  if (v > 0)    return ''
  return 'text-red-500'
}

// ---------------------------------------------------------------------------
// Filter pill button
// ---------------------------------------------------------------------------

function FilterPill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
        active
          ? 'bg-foreground text-background border-foreground'
          : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main list component
// ---------------------------------------------------------------------------

type SortKey = 'oos_sharpe' | 'is_sharpe' | 'decay_pct' | 'pub_year' | 'name'

export function AnomalyList({ anomalies }: { anomalies: Anomaly[] }) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [catFilter,    setCatFilter]    = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [search, setSearch]             = useState<string>('')
  const [sortKey, setSortKey]           = useState<SortKey>('oos_sharpe')
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('desc')

  // Derive unique categories
  const categories = useMemo(() => {
    const cats = new Set(anomalies.map(a => a.category).filter(Boolean) as string[])
    return ['all', ...Array.from(cats).sort()]
  }, [anomalies])

  // Filter
  const filtered = useMemo(() => {
    let list = anomalies
    if (statusFilter !== 'all') list = list.filter(a => a.status === statusFilter)
    if (catFilter    !== 'all') list = list.filter(a => a.category === catFilter)
    if (sourceFilter !== 'all') list = list.filter(a => (a.source ?? 'french') === sourceFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.osap_acronym ?? '').toLowerCase().includes(q) ||
        (a.authors ?? '').toLowerCase().includes(q) ||
        (a.category ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [anomalies, statusFilter, catFilter, sourceFilter, search])

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: number | string, vb: number | string
      if (sortKey === 'name') {
        va = a.name; vb = b.name
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }
      va = a[sortKey] as number
      vb = b[sortKey] as number
      return sortDir === 'asc' ? va - vb : vb - va
    })
  }, [filtered, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function SortArrow({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-muted-foreground/40 ml-0.5">↕</span>
    return <span className="ml-0.5">{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  // Counts
  const counts = useMemo(() => ({
    alive:    anomalies.filter(a => a.status === 'alive').length,
    weakened: anomalies.filter(a => a.status === 'weakened').length,
    faded:    anomalies.filter(a => a.status === 'faded').length,
    dead:     anomalies.filter(a => a.status === 'dead').length,
  }), [anomalies])

  return (
    <div>
      {/* Summary counts */}
      <div className="flex flex-wrap gap-3 mb-6">
        {([
          ['alive',    counts.alive,    'bg-green-100 text-green-800'],
          ['weakened', counts.weakened, 'bg-amber-100 text-amber-800'],
          ['faded',    counts.faded,    'bg-orange-100 text-orange-800'],
          ['dead',     counts.dead,     'bg-gray-100 text-gray-600'],
        ] as [string, number, string][]).map(([s, n, cls]) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer
              ${statusFilter === s ? 'ring-2 ring-offset-1 ring-foreground/30' : ''}
              ${cls.replace('bg-', 'bg-').replace('text-', 'text-')} border-transparent`}
          >
            {n} {s}
          </button>
        ))}
        <span className="text-xs text-muted-foreground self-center ml-auto">
          {filtered.length} of {anomalies.length} predictors
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4 items-start">
        {/* Search */}
        <input
          type="search"
          placeholder="Search name, acronym, authors…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-sm border rounded-md px-3 py-1.5 w-64 bg-background
                     placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {/* Source */}
        <div className="flex gap-1.5 items-center flex-wrap">
          <span className="text-xs text-muted-foreground">Source:</span>
          {[
            { v: 'all',    l: 'All' },
            { v: 'french', l: 'French' },
            { v: 'osap',   l: 'OSAP' },
          ].map(({ v, l }) => (
            <FilterPill key={v} label={l} active={sourceFilter === v} onClick={() => setSourceFilter(v)} />
          ))}
        </div>

        {/* Category */}
        <div className="flex gap-1.5 items-center flex-wrap">
          <span className="text-xs text-muted-foreground">Category:</span>
          {categories.map(c => (
            <FilterPill
              key={c}
              label={c === 'all' ? 'All' : c}
              active={catFilter === c}
              onClick={() => setCatFilter(c)}
            />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th
                className="text-left px-3 py-2 font-medium cursor-pointer hover:text-foreground"
                onClick={() => handleSort('name')}
              >
                Name <SortArrow col="name" />
              </th>
              <th className="text-left px-3 py-2 font-medium">Category</th>
              <th className="text-left px-3 py-2 font-medium">Journal</th>
              <th
                className="text-right px-3 py-2 font-medium cursor-pointer hover:text-foreground"
                onClick={() => handleSort('pub_year')}
              >
                Year <SortArrow col="pub_year" />
              </th>
              <th className="text-center px-3 py-2 font-medium">Status</th>
              <th
                className="text-right px-3 py-2 font-medium cursor-pointer hover:text-foreground"
                onClick={() => handleSort('is_sharpe')}
              >
                IS Sh. <SortArrow col="is_sharpe" />
              </th>
              <th
                className="text-right px-3 py-2 font-medium cursor-pointer hover:text-foreground"
                onClick={() => handleSort('oos_sharpe')}
              >
                OOS Sh. <SortArrow col="oos_sharpe" />
              </th>
              <th
                className="text-right px-3 py-2 font-medium cursor-pointer hover:text-foreground"
                onClick={() => handleSort('decay_pct')}
              >
                Decay <SortArrow col="decay_pct" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a, i) => {
              const slug = a.slug ?? a.id
              return (
                <tr
                  key={a.id}
                  className={`border-t hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/anomalies/${slug}`}
                      className="font-medium hover:underline underline-offset-4 leading-tight block"
                    >
                      {a.name}
                    </Link>
                    {a.osap_acronym && (
                      <span className="text-xs text-muted-foreground font-mono">{a.osap_acronym}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <CategoryPill category={a.category} />
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground font-mono">
                    {a.journal ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                    {a.pub_year}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className={`px-3 py-2 text-right font-mono text-xs tabular-nums ${sharpeColor(a.is_sharpe)}`}>
                    {a.is_sharpe.toFixed(2)}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono text-xs tabular-nums ${sharpeColor(a.oos_sharpe)}`}>
                    {a.oos_sharpe.toFixed(2)}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono text-xs tabular-nums ${
                    a.decay_pct > 70 ? 'text-red-500' : a.decay_pct > 40 ? 'text-amber-600' : 'text-muted-foreground'
                  }`}>
                    {a.decay_pct > 0 ? '+' : ''}{a.decay_pct.toFixed(0)}%
                  </td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No anomalies match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Click column headers to sort. IS = in-sample (pre-publication). OOS = out-of-sample (post-publication).
        Decay = (IS Sharpe − OOS Sharpe) / |IS Sharpe|.
      </p>
    </div>
  )
}
