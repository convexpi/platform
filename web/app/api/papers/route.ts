import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 300  // 5 minutes

export async function GET() {
  const db = await createClient()
  const { data, error } = await db
    .from('papers')
    .select('id, title, authors, year, journal, doi, arxiv_id, topics, is_oos_paper, wiki_generated_at, citation_count, curation_status')
    .in('curation_status', ['candidate', 'approved'])
    .order('year', { ascending: false })
    .limit(3000)

  if (error) {
    return NextResponse.json({ papers: [], error: error.message }, { status: 500 })
  }

  return NextResponse.json({ papers: data ?? [] })
}
