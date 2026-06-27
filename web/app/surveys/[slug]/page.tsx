import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { renderMarkdown } from '@/lib/markdown'
import { loadSurvey } from '@/lib/content'

export const dynamic = 'force-dynamic'

interface Survey { slug: string; title: string; topic: string | null; summary: string | null; markdown: string }

// Curated cross-links: each survey → the clean-room replications that recompute it.
// Links go to the replication's Colab notebook in the convexpi/replications repo.
const RELATED_REPLICATIONS: Record<string, { name: string; slug: string }[]> = {
  momentum: [
    { name: 'Jegadeesh-Titman momentum', slug: 'jegadeesh_titman_momentum' },
    { name: 'Industry momentum', slug: 'moskowitz_grinblatt_industry_momentum' },
    { name: 'Time-series (trend) momentum', slug: 'moskowitz_ooi_pedersen_trend' },
    { name: 'Asset-class momentum', slug: 'asness_moskowitz_pedersen_asset_momentum' },
  ],
  value: [
    { name: 'Fama-French HML', slug: 'fama_french_hml' },
    { name: 'Earnings yield (Basu)', slug: 'basu_earnings_yield' },
    { name: 'Cash-flow yield (Lakonishok)', slug: 'lakonishok_cashflow_yield' },
    { name: 'Dividend yield (Litzenberger-Ramaswamy)', slug: 'litzenberger_ramaswamy_dividend_yield' },
  ],
  quality: [
    { name: 'Gross profitability (Novy-Marx)', slug: 'novy_marx_profitability' },
    { name: 'Operating profitability / RMW', slug: 'fama_french_op_profitability' },
    { name: 'Accruals (Sloan)', slug: 'sloan_accruals' },
    { name: 'Investment / asset growth', slug: 'cooper_gulen_schill_investment' },
  ],
  'low-volatility': [
    { name: 'Betting against beta', slug: 'frazzini_pedersen_bab' },
    { name: 'Idiosyncratic volatility', slug: 'ang_idiosyncratic_volatility' },
    { name: 'MAX (lottery)', slug: 'bali_cakici_whitelaw_max' },
  ],
  size: [{ name: 'Fama-French SMB', slug: 'fama_french_smb' }],
  reversal: [
    { name: 'Short-term reversal', slug: 'jegadeesh_short_term_reversal' },
    { name: 'Long-term reversal (De Bondt-Thaler)', slug: 'debondt_thaler_long_term_reversal' },
  ],
}
const colab = (slug: string) =>
  `https://colab.research.google.com/github/convexpi/replications/blob/main/notebooks/${slug}.ipynb`
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

  // Prefer the community-edited file in the content repo; fall back to the DB copy.
  const body = (await loadSurvey(slug)) ?? s.markdown
  // GitHub-backed community editing (fork+PR for non-collaborators) + revision history.
  const CONTENT_REPO = 'https://github.com/convexpi/content'
  const editUrl = `${CONTENT_REPO}/edit/main/surveys/${slug}.md`
  const historyUrl = `${CONTENT_REPO}/commits/main/surveys/${slug}.md`

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

      {/* Community wiki action bar — editing via GitHub */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground border-y border-border py-2 mt-6">
        <span className="font-medium text-foreground">Community wiki</span>
        <a href={editUrl} target="_blank" rel="noopener noreferrer"
          className="hover:text-foreground underline underline-offset-4">✎ Edit</a>
        <a href={historyUrl} target="_blank" rel="noopener noreferrer"
          className="hover:text-foreground underline underline-offset-4">⟲ History</a>
      </div>

      <article
        className="prose-sm max-w-none text-foreground mt-6"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
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

      {/* Cross-links: replicate it + explore related research surfaces */}
      <section className="mt-10 rounded-xl border border-border bg-secondary/30 p-6">
        <h2 className="text-base font-semibold mb-3">Replicate &amp; explore</h2>
        {(RELATED_REPLICATIONS[s.slug] ?? []).length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">Clean-room replications</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {RELATED_REPLICATIONS[s.slug].map(r => (
                <li key={r.slug}>
                  <a href={colab(r.slug)} target="_blank" rel="noopener noreferrer"
                    className="text-foreground hover:text-[#C9A34E]">{r.name} ↗</a>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-1">Recomputed from building blocks and scored out of sample · <Link href="/replications" className="underline underline-offset-2">all replications</Link></p>
          </div>
        )}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <Link href="/research" className="text-foreground hover:text-[#C9A34E]">Factor reference →</Link>
          <Link href="/anomalies" className="text-foreground hover:text-[#C9A34E]">Anomaly graveyard →</Link>
          <Link href="/papers" className="text-foreground hover:text-[#C9A34E]">All papers →</Link>
          <Link href="/surveys" className="text-foreground hover:text-[#C9A34E]">Other surveys →</Link>
        </div>
      </section>
    </div>
  )
}
