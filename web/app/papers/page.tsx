'use client'

import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import type { WikiEntry } from '@/lib/content'

// ---------------------------------------------------------------------------
// This page is a client component so filtering is instant (no round-trips).
// Data is fetched once from /api/content-index (a thin server route that
// reads from the content repo) and cached for the session.
// ---------------------------------------------------------------------------

const TOPIC_LABELS: Record<string, string> = {
  momentum:             'Momentum',
  value:                'Value',
  quality:              'Quality',
  low_volatility:       'Low Vol',
  reversal:             'Reversal',
  size:                 'Size',
  meta:                 'Factor Zoo',
  microstructure:       'Microstructure',
  ml_finance:           'ML / AI',
  options:              'Options',
}

const TOPIC_COLORS: Record<string, string> = {
  momentum:       'bg-blue-100 text-blue-700',
  value:          'bg-purple-100 text-purple-700',
  quality:        'bg-teal-100 text-teal-700',
  low_volatility: 'bg-red-100 text-red-700',
  reversal:       'bg-indigo-100 text-indigo-700',
  size:           'bg-orange-100 text-orange-700',
  meta:           'bg-amber-100 text-amber-700',
  microstructure: 'bg-slate-100 text-slate-700',
  ml_finance:     'bg-pink-100 text-pink-700',
  options:        'bg-violet-100 text-violet-700',
}

function TopicPill({ topic }: { topic: string }) {
  const label = TOPIC_LABELS[topic] ?? topic
  const cls = TOPIC_COLORS[topic] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${cls}`}>
      {label}
    </span>
  )
}

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

function authorString(authors: WikiEntry['authors']): string {
  if (!authors?.length) return ''
  const names = authors.map(a => typeof a === 'string' ? a : a.name)
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} & ${names[1]}`
  return `${names[0]} et al.`
}

export default function PapersPage() {
  const [papers, setPapers] = useState<WikiEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [topicFilter, setTopicFilter] = useState<string>('all')
  const [oosOnly, setOosOnly] = useState(false)

  useEffect(() => {
    fetch('/api/content-index')
      .then(r => r.json())
      .then(d => { setPapers(d.wikis ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const allTopics = useMemo(() => {
    const s = new Set<string>()
    papers.forEach(p => (p.topics ?? []).forEach(t => s.add(t)))
    return ['all', ...Array.from(s).sort()]
  }, [papers])

  const filtered = useMemo(() => {
    let list = papers
    if (topicFilter !== 'all') list = list.filter(p => p.topics?.includes(topicFilter))
    if (oosOnly) list = list.filter(p => p.is_oos_paper)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        authorString(p.authors).toLowerCase().includes(q) ||
        (p.journal ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [papers, topicFilter, oosOnly, search])

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Research Papers</h1>
        <p className="text-muted-foreground max-w-2xl leading-relaxed">
          Academic papers on quantitative finance factors, anomalies, and the replication crisis —
          with LLM-generated structured wikis covering construction rules, IS/OOS evidence, and
          practical implications. Content sourced from arXiv q-fin and enriched via Semantic Scholar.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-start">
        <input
          type="search"
          placeholder="Search title, authors, journal…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-sm border rounded-md px-3 py-1.5 w-64 bg-background
                     placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="flex gap-1.5 items-center flex-wrap">
          <span className="text-xs text-muted-foreground">Topic:</span>
          {allTopics.map(t => (
            <FilterPill
              key={t}
              label={t === 'all' ? 'All' : (TOPIC_LABELS[t] ?? t)}
              active={topicFilter === t}
              onClick={() => setTopicFilter(t)}
            />
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={oosOnly}
            onChange={e => setOosOnly(e.target.checked)}
            className="rounded"
          />
          OOS evidence only
        </label>

        {!loading && (
          <span className="text-xs text-muted-foreground self-center ml-auto">
            {filtered.length} of {papers.length} papers
          </span>
        )}
      </div>

      {/* Paper list */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground py-12 text-center">No papers match your filters.</div>
      ) : (
        <div className="divide-y border rounded-lg overflow-hidden">
          {filtered.map(p => (
            <div key={p.id} className="px-4 py-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/papers/${p.id}`}
                    className="font-medium text-foreground hover:underline underline-offset-4 leading-snug"
                  >
                    {p.title}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {authorString(p.authors)}
                    {p.journal && <> · <span className="font-mono">{p.journal}</span></>}
                    {p.year && <> · {p.year}</>}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(p.topics ?? []).map(t => <TopicPill key={t} topic={t} />)}
                    {p.is_oos_paper && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                        OOS evidence
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.arxiv_id && (
                    <a
                      href={`https://arxiv.org/abs/${p.arxiv_id}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                    >
                      arXiv
                    </a>
                  )}
                  {p.doi && (
                    <a
                      href={`https://doi.org/${p.doi}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                    >
                      DOI
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-xs text-muted-foreground border-t pt-4 space-y-1">
        <p>
          Papers sourced from arXiv q-fin categories. Wikis generated by Claude Haiku
          from abstracts and available full text. Not peer-reviewed summaries.
        </p>
        <p>
          Content repo:{' '}
          <a href="https://github.com/convexpi/content" target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-4">
            github.com/convexpi/content
          </a>
        </p>
      </div>
    </div>
  )
}
