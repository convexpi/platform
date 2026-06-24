import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Pipeline — Admin' }

function ago(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = (Date.now() - new Date(iso).getTime()) / 86400_000
  if (d < 1) return 'today'
  if (d < 2) return 'yesterday'
  return `${Math.floor(d)} days ago`
}

const WORKFLOWS = [
  { name: 'Paper ingestion + curation', repo: 'lab', url: 'https://github.com/convexpi/lab/actions', note: 'arXiv / journals / citation graph → relevance gate' },
  { name: 'Replication leaderboard + wiki sync', repo: 'replications', url: 'https://github.com/convexpi/replications/actions/workflows/leaderboard.yml', note: 'quarterly: benchmark + snapshot + paper-wiki sync' },
  { name: 'Anomaly stats refresh', repo: 'lab', url: 'https://github.com/convexpi/lab/actions/workflows/anomalies.yml', note: 'monthly: Fama-French + OSAP decay stats' },
  { name: 'Arena seasons', repo: 'lab', url: 'https://github.com/convexpi/lab/actions/workflows/seasons.yml', note: 'rolling monthly competition seasons' },
]

export default async function PipelinePage() {
  const db = createAdminClient()
  const [papers, wiki, contribs, lastPaper, lastContrib, lastGrade] = await Promise.all([
    db.from('papers').select('*', { count: 'exact', head: true }).in('curation_status', ['candidate', 'approved']),
    db.from('papers').select('*', { count: 'exact', head: true }).not('wiki_generated_at', 'is', null),
    db.from('contributions').select('*', { count: 'exact', head: true }),
    db.from('papers').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('contributions').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('grade_reports').select('graded_at').order('graded_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const stats = [
    { label: 'Curated papers', value: papers.count ?? 0 },
    { label: 'Papers with wiki', value: wiki.count ?? 0 },
    { label: 'Contributions', value: contribs.count ?? 0 },
    { label: 'Last paper ingested', value: ago(lastPaper.data?.created_at) },
    { label: 'Last contribution', value: ago(lastContrib.data?.created_at) },
    { label: 'Last grading', value: ago(lastGrade.data?.graded_at) },
  ]

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">Pipeline</h1>
      <p className="text-sm text-muted-foreground mb-6">Data freshness and the jobs that keep the platform current.</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="text-2xl font-mono font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">Scheduled jobs</h2>
      <div className="rounded-xl border divide-y bg-card">
        {WORKFLOWS.map(w => (
          <a key={w.name} href={w.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
            <div>
              <p className="text-sm font-medium text-foreground">{w.name}</p>
              <p className="text-xs text-muted-foreground">{w.note}</p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0 font-mono">convexpi/{w.repo} ↗</span>
          </a>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Jobs run on GitHub Actions (schedule + manual dispatch). Open a workflow to see run history or
        trigger it manually with &ldquo;Run workflow&rdquo;.
      </p>
    </div>
  )
}
