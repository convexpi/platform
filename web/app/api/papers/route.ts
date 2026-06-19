import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 300  // 5 minutes

const SELECT =
  'id, title, authors, year, journal, doi, arxiv_id, topics, is_oos_paper, wiki_generated_at, citation_count, curation_status'

// PostgREST caps each response at 1000 rows, so page through with .range()
// until the corpus is exhausted. Metadata-only rows keep the payload small
// (~250 KB gzipped for the full library), filtered client-side on /papers.
const PAGE = 1000

export async function GET() {
  const db = await createClient()
  const papers: unknown[] = []

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('papers')
      .select(SELECT)
      .in('curation_status', ['candidate', 'approved'])
      .order('citation_count', { ascending: false, nullsFirst: false })
      .range(from, from + PAGE - 1)

    if (error) {
      return NextResponse.json({ papers, error: error.message }, { status: 500 })
    }
    if (!data || data.length === 0) break
    papers.push(...data)
    if (data.length < PAGE) break
  }

  return NextResponse.json({ papers })
}
