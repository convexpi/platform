// Lightweight markdown → HTML renderer for wiki/survey content (no deps).
// Handles headings, tables, lists, hr, and inline bold/italic/code/links.

export function inlineMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, (_m, text, href) => {
      const internal = href.startsWith('/')
      const attrs = internal ? '' : ' target="_blank" rel="noopener noreferrer"'
      return `<a href="${href}" class="underline underline-offset-4 text-blue-600 dark:text-blue-400"${attrs}>${text}</a>`
    })
}

export function renderMarkdown(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let inTable = false
  let tableHeader = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.trim().startsWith('|')) {
      if (!inTable) {
        out.push('<div class="overflow-x-auto my-4"><table class="text-sm w-full border-collapse">')
        inTable = true
        tableHeader = true
      }
      if (/^\|[-\s|:]+\|$/.test(line.trim())) { tableHeader = false; continue }
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
      const tag = tableHeader ? 'th' : 'td'
      const cls = tableHeader
        ? 'border border-border px-3 py-1.5 bg-muted font-medium text-left'
        : 'border border-border px-3 py-1.5'
      out.push(`<tr>${cells.map(c => `<${tag} class="${cls}">${inlineMarkdown(c)}</${tag}>`).join('')}</tr>`)
      continue
    } else if (inTable) {
      out.push('</table></div>'); inTable = false; tableHeader = false
    }

    const h3 = line.match(/^### (.+)/)
    if (h3) { out.push(`<h3 class="text-base font-semibold mt-6 mb-2">${inlineMarkdown(h3[1])}</h3>`); continue }
    const h2 = line.match(/^## (.+)/)
    if (h2) { out.push(`<h2 class="text-lg font-bold mt-8 mb-3 border-b pb-1">${inlineMarkdown(h2[1])}</h2>`); continue }
    const h1 = line.match(/^# (.+)/)
    if (h1) { out.push(`<h1 class="text-xl font-bold mt-6 mb-3">${inlineMarkdown(h1[1])}</h1>`); continue }

    if (/^---+$/.test(line.trim())) { out.push('<hr class="my-6 border-border" />'); continue }

    const li = line.match(/^[-*+] (.+)/)
    if (li) { out.push(`<li class="ml-4 list-disc mb-0.5">${inlineMarkdown(li[1])}</li>`); continue }
    const oli = line.match(/^\d+\. (.+)/)
    if (oli) { out.push(`<li class="ml-4 list-decimal mb-0.5">${inlineMarkdown(oli[1])}</li>`); continue }

    if (line.trim() === '') { out.push('<br />'); continue }
    out.push(`<p class="mb-3 leading-relaxed">${inlineMarkdown(line)}</p>`)
  }
  if (inTable) out.push('</table></div>')
  return out.join('\n')
}
