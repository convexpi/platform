import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { setCuration, setPaperUrl } from './actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Papers — Admin' }

interface Paper {
  id: string; title: string; year: number | null; journal: string | null
  citation_count: number | null; curation_status: string; topics: string[] | null
  wiki_generated_at: string | null; fulltext_source: string | null; manual_pdf_url: string | null
}

const CUR_STYLE: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-700',
  candidate: 'bg-slate-100 text-slate-600',
  rejected: 'bg-red-100 text-red-600',
}

const PAGE_SIZE = 100

// Filter views. `wiki_no_ft` is the "wiki pages without a paper (full text)" filter.
const VIEWS: { key: string; label: string }[] = [
  { key: 'queue', label: 'Review queue' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All papers' },
  { key: 'wiki_no_ft', label: 'Wiki · no full text' },
]

export default async function AdminPapers(
  { searchParams }: { searchParams: Promise<{ q?: string; view?: string; status?: string; page?: string; err?: string }> },
) {
  const sp = await searchParams
  const q = sp.q
  const err = sp.err
  const view = sp.view || sp.status || 'queue'   // `status` kept for backward-compat links
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1)
  const db = createAdminClient()

  const cols = 'id, title, year, journal, citation_count, curation_status, topics, wiki_generated_at, fulltext_source, manual_pdf_url'
  let query = db.from('papers').select(cols, { count: 'exact' })

  if (q?.trim()) {
    query = query.ilike('title', `*${q.trim()}*`)
  } else if (view === 'wiki_no_ft') {
    query = query.not('wiki_markdown', 'is', null).is('fulltext_source', null)
  } else if (view === 'all') {
    // no curation/status filter
  } else if (view === 'approved' || view === 'rejected') {
    query = query.eq('curation_status', view)
  } else {
    query = query.eq('curation_status', 'candidate')   // review queue (default)
  }

  query = query
    .order('citation_count', { ascending: false, nullsFirst: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  const { data, count } = await query
  const papers = (data ?? []) as Paper[]
  const total = count ?? 0
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)

  const linkFor = (extra: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (!q) params.set('view', view)
    for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== '') params.set(k, String(v))
    return `/admin/papers?${params.toString()}`
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl font-semibold">Papers</h1>
        <form method="GET" className="flex items-center gap-2">
          <input name="q" defaultValue={q} placeholder="Search all titles…"
            className="pl-3 pr-3 py-1.5 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring w-56" />
        </form>
      </div>

      {err && (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">{err}</div>
      )}

      {/* Filter views */}
      {!q && (
        <div className="flex flex-wrap gap-1 mb-3 text-xs">
          {VIEWS.map(v => (
            <Link key={v.key} href={`/admin/papers?view=${v.key}`}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                view === v.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}>{v.label}</Link>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground mb-5">
        {q
          ? <>Search results for “{q}” — <strong>{total.toLocaleString()}</strong> match</>
          : view === 'wiki_no_ft'
            ? <><strong>{total.toLocaleString()}</strong> wiki pages have no full-text paper on file. Find an open-access version and we can ground/verify the wiki against it.</>
            : <><strong>{total.toLocaleString()}</strong> papers — approve to protect from the relevance sweep, reject to remove from the public library.</>}
        {total > 0 && <> · showing {from.toLocaleString()}–{to.toLocaleString()}</>}
      </p>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Title</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Full text</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Cites</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {papers.map(p => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors align-top">
                <td className="px-4 py-3">
                  <Link href={`/papers/${p.id}`} className="font-medium hover:text-primary transition-colors">{p.title}</Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[p.journal, p.year].filter(Boolean).join(' · ')}
                    {(p.topics ?? []).length > 0 && <> · {(p.topics ?? []).join(', ')}</>}
                    {p.wiki_generated_at && <> · <span className="text-blue-600">wiki</span></>}
                  </p>
                </td>
                <td className="px-4 py-3 min-w-[220px]">
                  {p.fulltext_source
                    ? <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{p.fulltext_source}</span>
                    : <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">none</span>}
                  {/* Paste a public PDF link for this paper */}
                  <form action={setPaperUrl} className="mt-1.5 flex items-center gap-1">
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      name="url"
                      defaultValue={p.manual_pdf_url ?? ''}
                      placeholder="paste public PDF link…"
                      className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button type="submit" className="text-[11px] px-2 py-1 rounded border hover:bg-muted whitespace-nowrap">save</button>
                  </form>
                  {p.manual_pdf_url && (
                    <a href={p.manual_pdf_url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 hover:underline break-all">{p.manual_pdf_url}</a>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground tabular-nums">{p.citation_count ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CUR_STYLE[p.curation_status] ?? CUR_STYLE.candidate}`}>{p.curation_status}</span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap text-[11px]">
                  {p.curation_status !== 'approved' && <CurBtn id={p.id} status="approved" label="approve" cls="text-emerald-700 hover:text-emerald-900" />}
                  {p.curation_status !== 'rejected' && <CurBtn id={p.id} status="rejected" label="reject" cls="text-red-600 hover:text-red-800" />}
                  {p.curation_status !== 'candidate' && <CurBtn id={p.id} status="candidate" label="reset" cls="text-muted-foreground hover:text-foreground" />}
                </td>
              </tr>
            ))}
            {papers.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No papers found.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          {page > 1
            ? <Link href={linkFor({ page: page - 1 })} className="px-3 py-1.5 rounded-md border hover:bg-muted">← Prev</Link>
            : <span className="px-3 py-1.5 text-muted-foreground/50">← Prev</span>}
          <span className="text-muted-foreground">Page {page} of {lastPage.toLocaleString()}</span>
          {page < lastPage
            ? <Link href={linkFor({ page: page + 1 })} className="px-3 py-1.5 rounded-md border hover:bg-muted">Next →</Link>
            : <span className="px-3 py-1.5 text-muted-foreground/50">Next →</span>}
        </div>
      )}
    </div>
  )
}

function CurBtn({ id, status, label, cls }: { id: string; status: string; label: string; cls: string }) {
  return (
    <form action={setCuration} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={`ml-2 underline underline-offset-2 ${cls}`}>{label}</button>
    </form>
  )
}
