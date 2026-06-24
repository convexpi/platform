import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { setCuration } from './actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Papers — Admin' }

interface Paper {
  id: string; title: string; year: number | null; journal: string | null
  citation_count: number | null; curation_status: string; topics: string[] | null
  wiki_generated_at: string | null
}

const CUR_STYLE: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-700',
  candidate: 'bg-slate-100 text-slate-600',
  rejected: 'bg-red-100 text-red-600',
}

export default async function AdminPapers({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams
  const db = createAdminClient()

  let query = db.from('papers')
    .select('id, title, year, journal, citation_count, curation_status, topics, wiki_generated_at')
    .order('citation_count', { ascending: false, nullsFirst: false })
    .limit(60)
  if (q?.trim()) query = query.ilike('title', `*${q.trim()}*`)
  else query = query.eq('curation_status', status || 'candidate')

  const { data } = await query
  const papers = (data ?? []) as Paper[]

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl font-semibold">Papers</h1>
        <form method="GET" className="flex items-center gap-2">
          <input name="q" defaultValue={q} placeholder="Search title…"
            className="pl-3 pr-3 py-1.5 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring w-56" />
        </form>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        {q ? `Search results for “${q}”` : 'Review queue: highest-cited candidates'} — approve to protect
        from the relevance sweep, reject to remove from the public library.
      </p>

      {!q && (
        <div className="flex gap-1 mb-5 text-xs">
          {['candidate', 'approved', 'rejected'].map(s => (
            <Link key={s} href={`/admin/papers?status=${s}`}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                (status || 'candidate') === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}>{s}</Link>
          ))}
        </div>
      )}

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Title</th>
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
            {papers.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">No papers found.</td></tr>}
          </tbody>
        </table>
      </div>
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
