'use client'

import { useState } from 'react'
import { Check, Quote } from 'lucide-react'

type PaperProps = {
  title: string
  authors: string
  year: number
  journal: string
  url?: string
}

function makeBibTeX({ title, authors, year, journal, url }: PaperProps): string {
  // Derive cite key: first author surname + year
  const firstAuthor = authors.split(',')[0].trim().split(' ').pop() ?? 'Author'
  const citeKey = `${firstAuthor}${year}`

  // Extract DOI if URL is a doi.org link
  const doi = url?.includes('doi.org') ? url.replace(/^https?:\/\/(dx\.)?doi\.org\//, '') : undefined

  const lines = [
    `@article{${citeKey},`,
    `  author  = {${authors}},`,
    `  title   = {${title}},`,
    `  journal = {${journal}},`,
    `  year    = {${year}},`,
    ...(doi ? [`  doi     = {${doi}},`] : url ? [`  url     = {${url}},`] : []),
    `}`,
  ]
  return lines.join('\n')
}

export function CopyBibTeX(paper: PaperProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(makeBibTeX(paper))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5 px-1.5 rounded hover:bg-muted"
      title="Copy BibTeX citation"
    >
      {copied ? (
        <Check className="w-3 h-3 text-green-600" />
      ) : (
        <Quote className="w-3 h-3" />
      )}
      <span className="font-mono">{copied ? 'Copied' : 'BibTeX'}</span>
    </button>
  )
}
