import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Search — Admin' }

export default async function AdminSearch({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const term = (q ?? '').trim()
  const db = createAdminClient()

  let users: { id: string; username: string | null; display_name: string | null }[] = []
  let papers: { id: string; title: string; year: number | null; curation_status: string }[] = []
  let subs: { id: string; strategy_name: string; status: string; user_id: string }[] = []
  let cohorts: { slug: string; name: string; type: string; status: string }[] = []
  let messages: { id: string; name: string | null; email: string | null; message: string }[] = []

  if (term) {
    const like = `*${term}*`
    const [u, p, s, c, m] = await Promise.all([
      db.from('profiles').select('id, username, display_name').or(`username.ilike.${like},display_name.ilike.${like}`).limit(15),
      db.from('papers').select('id, title, year, curation_status').ilike('title', like).limit(15),
      db.from('submissions').select('id, strategy_name, status, user_id').ilike('strategy_name', like).limit(15),
      db.from('cohorts').select('slug, name, type, status').ilike('name', like).limit(15),
      db.from('contact_messages').select('id, name, email, message').or(`name.ilike.${like},email.ilike.${like},message.ilike.${like}`).limit(15),
    ])
    users = (u.data ?? []) as typeof users
    papers = (p.data ?? []) as typeof papers
    subs = (s.data ?? []) as typeof subs
    cohorts = (c.data ?? []) as typeof cohorts
    messages = (m.data ?? []) as typeof messages
  }

  const total = users.length + papers.length + subs.length + cohorts.length + messages.length

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">Search</h1>
      <p className="text-sm text-muted-foreground mb-5">Across users, papers, submissions, cohorts, and messages.</p>
      <form method="GET" className="mb-8">
        <input name="q" defaultValue={term} autoFocus placeholder="Search everything…"
          className="w-full text-sm border rounded-lg px-4 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
      </form>

      {term && total === 0 && <p className="text-sm text-muted-foreground">No matches for &ldquo;{term}&rdquo;.</p>}

      {users.length > 0 && (
        <Section title={`Users (${users.length})`}>
          {users.map(u => (
            <Row key={u.id} href={u.username ? `/profile/${u.username}` : undefined}
              left={u.display_name || u.username || u.id} right={u.username ? `@${u.username}` : ''} />
          ))}
        </Section>
      )}
      {papers.length > 0 && (
        <Section title={`Papers (${papers.length})`}>
          {papers.map(p => (
            <Row key={p.id} href={`/papers/${p.id}`} left={p.title} right={`${p.year ?? ''} · ${p.curation_status}`} />
          ))}
        </Section>
      )}
      {subs.length > 0 && (
        <Section title={`Submissions (${subs.length})`}>
          {subs.map(s => (
            <Row key={s.id} href={`/admin/submissions?q=${encodeURIComponent(s.strategy_name)}`} left={s.strategy_name} right={s.status} />
          ))}
        </Section>
      )}
      {cohorts.length > 0 && (
        <Section title={`Cohorts (${cohorts.length})`}>
          {cohorts.map(c => (
            <Row key={c.slug} href={`/${c.type === 'competition' ? 'compete' : 'classroom'}/${c.slug}`} left={c.name} right={`${c.type} · ${c.status}`} />
          ))}
        </Section>
      )}
      {messages.length > 0 && (
        <Section title={`Messages (${messages.length})`}>
          {messages.map(m => (
            <Row key={m.id} href="/admin/messages" left={(m.name || m.email || 'message')} right={m.message.slice(0, 50)} />
          ))}
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">{title}</h2>
      <div className="rounded-xl border divide-y bg-card">{children}</div>
    </div>
  )
}

function Row({ href, left, right }: { href?: string; left: string; right: string }) {
  const inner = (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-muted/30 transition-colors">
      <span className="text-sm text-foreground truncate">{left}</span>
      <span className="text-xs text-muted-foreground shrink-0 truncate max-w-[40%]">{right}</span>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}
