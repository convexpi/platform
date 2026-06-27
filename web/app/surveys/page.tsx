import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Topic surveys — ConvexPi',
  description: 'Synthesized surveys of the empirical asset-pricing literature, built from the paper-wiki library — what each anomaly is, why it might work, and whether it survives out of sample.',
}

interface Survey { slug: string; title: string; summary: string | null; topic: string | null }

export default async function SurveysPage() {
  const db = await createClient()
  const { data } = await db.from('surveys')
    .select('slug, title, summary, topic')
    .eq('status', 'published')
    .order('title', { ascending: true })
  const surveys = (data ?? []) as Survey[]

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-serif text-4xl text-foreground mb-3 leading-tight">Topic surveys</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Synthesized surveys of the empirical asset-pricing literature, built from the paper-wiki
          library: what each anomaly is, the arc of how it was discovered, why it might work, its
          failure modes, and whether it survives out of sample — with links to the replications and
          missions so you can run it yourself.
        </p>
      </div>

      {surveys.length > 0 ? (
        <div className="flex flex-col gap-4">
          {surveys.map(s => (
            <Link key={s.slug} href={`/surveys/${s.slug}`}
              className="block rounded-xl border border-border bg-card px-6 py-5 hover:border-[#C9A34E] transition-colors">
              <h2 className="font-serif text-xl text-foreground">{s.title}</h2>
              {s.summary && <p className="text-sm text-muted-foreground mt-1 leading-snug">{s.summary}</p>}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No surveys published yet.</p>
      )}

      <p className="text-xs text-muted-foreground mt-8">
        More topics are in progress as wiki coverage deepens (value, quality, low-volatility, the
        factor zoo). Each survey is regenerated as the underlying paper wikis are verified and enriched.
      </p>
    </div>
  )
}
