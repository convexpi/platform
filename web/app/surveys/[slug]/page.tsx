import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { renderMarkdown } from '@/lib/markdown'

export const dynamic = 'force-dynamic'

interface Survey { slug: string; title: string; topic: string | null; summary: string | null; markdown: string }
interface KeyPaper { id: string; title: string; authors: { name?: string }[] | null; year: number | null; journal: string | null }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const db = await createClient()
  const { data } = await db.from('surveys').select('title, summary').eq('slug', slug).eq('status', 'published').single()
  if (!data) return { title: 'Survey — ConvexPi' }
  return { title: `${data.title} — Survey — ConvexPi`, description: data.summary ?? undefined }
}

export default async function SurveyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = await createClient()

  const { data: survey } = await db.from('surveys')
    .select('slug, title, topic, summary, markdown')
    .eq('slug', slug).eq('status', 'published').single()
  if (!survey) notFound()
  const s = survey as Survey

  // Dynamic "Key papers": the topic's wiki'd papers, most-cited first.
  let papers: KeyPaper[] = []
  if (s.topic) {
    const { data } = await db.from('papers')
      .select('id, title, authors, year, journal, citation_count')
      .filter('topics', 'cs', JSON.stringify([s.topic]))   // jsonb contains
      .not('wiki_markdown', 'is', null)
      .order('citation_count', { ascending: false, nullsFirst: false })
      .limit(40)
    papers = (data ?? []) as KeyPaper[]
  }

  const author = (p: KeyPaper) => {
    const a = (p.authors ?? [])[0]
    const name = a && typeof a === 'object' ? a.name : undefined
    return name ? name.split(' ').slice(-1)[0] : null
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Link href="/surveys" className="text-sm text-muted-foreground hover:text-foreground">← Surveys</Link>
      <div className="mt-3 mb-2">
        <p className="text-xs font-semibold tracking-[0.15em] text-[#C9A34E] uppercase mb-2">Topic survey</p>
        <h1 className="font-serif text-4xl text-foreground leading-tight">{s.title}</h1>
        {s.summary && <p className="text-muted-foreground text-lg leading-relaxed mt-3">{s.summary}</p>}
      </div>

      <article
        className="prose-sm max-w-none text-foreground mt-6"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(s.markdown) }}
      />

      {/* Dynamic key-papers, drawn from the topic's wikis so it stays fresh */}
      {papers.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold mb-3 border-b pb-1">Key papers ({papers.length})</h2>
          <p className="text-xs text-muted-foreground mb-4">
            The {s.topic} papers in the library with a wiki, most-cited first. Each links to its summary.
          </p>
          <ul className="flex flex-col divide-y divide-border">
            {papers.map(p => (
              <li key={p.id} className="py-2">
                <Link href={`/papers/${p.id}`} className="font-medium text-sm hover:text-[#C9A34E]">{p.title}</Link>
                <p className="text-xs text-muted-foreground">{[author(p), p.journal, p.year].filter(Boolean).join(' · ')}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
