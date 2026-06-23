import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { loadWiki } from '@/lib/content'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Markdown rendering — plain, no heavy deps.
// We parse the LLM-generated wiki markdown and render it as HTML using
// a tiny regex-based converter. Keeps bundle size minimal.
// ---------------------------------------------------------------------------

function renderMarkdown(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let inTable = false
  let tableHeader = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Table detection
    if (line.trim().startsWith('|')) {
      if (!inTable) {
        out.push('<div class="overflow-x-auto my-4"><table class="text-sm w-full border-collapse">')
        inTable = true
        tableHeader = true
      }
      // Skip separator row (|---|---|)
      if (/^\|[-\s|:]+\|$/.test(line.trim())) {
        tableHeader = false
        continue
      }
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
      const tag = tableHeader ? 'th' : 'td'
      const cls = tableHeader
        ? 'border border-border px-3 py-1.5 bg-muted font-medium text-left'
        : 'border border-border px-3 py-1.5'
      out.push(`<tr>${cells.map(c => `<${tag} class="${cls}">${inlineMarkdown(c)}</${tag}>`).join('')}</tr>`)
      continue
    } else if (inTable) {
      out.push('</table></div>')
      inTable = false
      tableHeader = false
    }

    // Headings
    const h3 = line.match(/^### (.+)/)
    if (h3) { out.push(`<h3 class="text-base font-semibold mt-6 mb-2">${inlineMarkdown(h3[1])}</h3>`); continue }
    const h2 = line.match(/^## (.+)/)
    if (h2) { out.push(`<h2 class="text-lg font-bold mt-8 mb-3 border-b pb-1">${inlineMarkdown(h2[1])}</h2>`); continue }
    const h1 = line.match(/^# (.+)/)
    if (h1) { out.push(`<h1 class="text-xl font-bold mt-6 mb-3">${inlineMarkdown(h1[1])}</h1>`); continue }

    // HR
    if (/^---+$/.test(line.trim())) { out.push('<hr class="my-6 border-border" />'); continue }

    // Bullet list items
    const li = line.match(/^[-*+] (.+)/)
    if (li) { out.push(`<li class="ml-4 list-disc mb-0.5">${inlineMarkdown(li[1])}</li>`); continue }

    // Numbered list
    const oli = line.match(/^\d+\. (.+)/)
    if (oli) { out.push(`<li class="ml-4 list-decimal mb-0.5">${inlineMarkdown(oli[1])}</li>`); continue }

    // Blank line
    if (line.trim() === '') { out.push('<br />'); continue }

    // Paragraph
    out.push(`<p class="mb-3 leading-relaxed">${inlineMarkdown(line)}</p>`)
  }

  if (inTable) out.push('</table></div>')
  return out.join('\n')
}

function inlineMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="underline underline-offset-4 text-blue-600 dark:text-blue-400" target="_blank" rel="noopener noreferrer">$1</a>')
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

type Props = { params: Promise<{ id: string }> }

async function fetchPaper(id: string) {
  const db = await createClient()
  const { data } = await db
    .from('papers')
    .select('id, title, authors, year, journal, doi, arxiv_id, topics, is_oos_paper, wiki_generated_at, wiki_markdown, abstract, citation_count')
    .eq('id', id)
    .single()
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const entry = await fetchPaper(id)
  if (!entry) return { title: 'Paper not found' }
  return {
    title: `${entry.title} — ConvexPi`,
    description: entry.wiki_generated_at
      ? `Structured wiki for "${entry.title}" covering factor construction, IS/OOS evidence, and practical implications.`
      : `${entry.title} — research paper on quantitative finance.`,
  }
}

export default async function PaperPage({ params }: Props) {
  const { id } = await params
  const entry = await fetchPaper(id)
  if (!entry) notFound()

  // Wiki markdown: prefer the community-edited file in the content repo, fall back to the
  // wiki_markdown stored in the database (what the /papers badge reflects).
  const wiki = entry.wiki_generated_at
    ? ((await loadWiki(id)) ?? entry.wiki_markdown ?? null)
    : (entry.wiki_markdown ?? null)

  // GitHub-backed wiki editing: edit opens GitHub's editor (fork+PR for
  // non-collaborators), history is the Wikipedia-style revision log with diffs.
  const CONTENT_REPO = 'https://github.com/convexpi/content'
  const editUrl    = `${CONTENT_REPO}/edit/main/wikis/${id}.md`
  const historyUrl = `${CONTENT_REPO}/commits/main/wikis/${id}.md`
  const newUrl     = `${CONTENT_REPO}/new/main?filename=wikis/${id}.md`

  const authorStr = (() => {
    if (!entry.authors?.length) return null
    const names = (entry.authors as { name: string }[] | string[]).map(
      (a: { name: string } | string) => typeof a === 'string' ? a : a.name
    )
    if (names.length <= 3) return names.join(', ')
    return `${names[0]}, ${names[1]}, et al.`
  })()

  const TOPIC_LABELS: Record<string, string> = {
    momentum: 'Momentum', value: 'Value', quality: 'Quality',
    low_volatility: 'Low Vol', reversal: 'Reversal', size: 'Size',
    meta: 'Factor Zoo', microstructure: 'Microstructure',
    ml_finance: 'ML / AI', options: 'Options',
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">

      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground mb-6">
        <Link href="/papers" className="hover:underline underline-offset-4">Papers</Link>
        {' / '}
        <span className="text-foreground">{entry.title.slice(0, 60)}{entry.title.length > 60 ? '…' : ''}</span>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold leading-tight mb-3">{entry.title}</h1>

        <div className="text-sm text-muted-foreground space-y-1">
          {authorStr && <p>{authorStr}</p>}
          <p>
            {entry.journal && <span className="font-mono">{entry.journal}</span>}
            {entry.journal && entry.year && ' · '}
            {entry.year && <span>{entry.year}</span>}
            {entry.citation_count != null && entry.citation_count > 0 && (
              <> · {entry.citation_count} citations</>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {((entry.topics ?? []) as string[]).map((t: string) => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {TOPIC_LABELS[t] ?? t}
            </span>
          ))}
          {entry.is_oos_paper && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              OOS evidence
            </span>
          )}
        </div>

        <div className="flex gap-3 mt-4">
          {entry.arxiv_id && (
            <a
              href={`https://arxiv.org/abs/${entry.arxiv_id}`}
              target="_blank" rel="noopener noreferrer"
              className="text-sm border rounded-md px-3 py-1 hover:bg-muted transition-colors"
            >
              arXiv ↗
            </a>
          )}
          {entry.doi && (
            <a
              href={`https://doi.org/${entry.doi}`}
              target="_blank" rel="noopener noreferrer"
              className="text-sm border rounded-md px-3 py-1 hover:bg-muted transition-colors"
            >
              DOI ↗
            </a>
          )}
        </div>
      </header>

      {/* Wiki action bar — community editing via GitHub */}
      {wiki && (
        <div className="flex items-center gap-4 mb-5 border-b pb-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Community wiki</span>
          <a href={editUrl} target="_blank" rel="noopener noreferrer"
            className="hover:text-foreground underline underline-offset-4">✎ Edit</a>
          <a href={historyUrl} target="_blank" rel="noopener noreferrer"
            className="hover:text-foreground underline underline-offset-4">⟲ History</a>
        </div>
      )}

      {/* Wiki content */}
      {wiki ? (
        <article
          className="prose-sm max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(wiki) }}
        />
      ) : (
        <div className="rounded-lg border border-border bg-muted/30 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No wiki for this paper yet.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <a href={newUrl} target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground">
              Write the first one on GitHub
            </a>{' '}— or it will be picked up by the weekly pipeline.
          </p>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 pt-4 border-t text-xs text-muted-foreground space-y-1">
        {wiki && (
          <p>
            Community-maintained wiki — anyone can{' '}
            <a href={editUrl} target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground">suggest an edit</a>{' '}
            or view its{' '}
            <a href={historyUrl} target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground">revision history</a>.
            Not peer-reviewed; verify claims against the original paper.
          </p>
        )}
        {entry.wiki_generated_at && (
          <p>Wiki last updated: {new Date(entry.wiki_generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        )}
      </footer>
    </div>
  )
}
