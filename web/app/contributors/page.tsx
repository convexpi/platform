import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/avatar'
import { badgesFor, TIER_STYLE, POINT_RULES, type RepRow } from '@/lib/reputation'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Contributors — ConvexPi',
  description:
    'The people building ConvexPi in the open — earning reputation and badges for replications, paper wikis, and strategies that survive out of sample.',
}

interface Profile {
  id: string
  username: string | null
  display_name: string | null
  github_username: string | null
}

export default async function ContributorsPage() {
  const db = await createClient()

  const { data: repRows } = await db
    .from('contributor_reputation')
    .select('*')
    .order('reputation', { ascending: false })
    .limit(100)
  const rows = (repRows ?? []) as RepRow[]

  // Resolve each contributor to a profile (by user_id, else by github_username) for display + links.
  const userIds = rows.map(r => r.user_id).filter(Boolean) as string[]
  const ghs = rows.map(r => r.github_username).filter(Boolean) as string[]
  const profiles: Profile[] = []
  if (userIds.length) {
    const { data } = await db.from('profiles').select('id, username, display_name, github_username').in('id', userIds)
    profiles.push(...((data ?? []) as Profile[]))
  }
  if (ghs.length) {
    const { data } = await db.from('profiles').select('id, username, display_name, github_username').in('github_username', ghs)
    for (const p of (data ?? []) as Profile[]) if (!profiles.find(x => x.id === p.id)) profiles.push(p)
  }
  const byId = new Map(profiles.map(p => [p.id, p]))
  const byGh = new Map(profiles.filter(p => p.github_username).map(p => [p.github_username as string, p]))

  function display(r: RepRow): { name: string; username: string | null; gh: string | null } {
    const p = (r.user_id && byId.get(r.user_id)) || (r.github_username && byGh.get(r.github_username)) || null
    if (p) return { name: p.display_name || p.username || p.github_username || 'Researcher', username: p.username, gh: p.github_username }
    return { name: r.github_username ?? 'Researcher', username: null, gh: r.github_username }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-3">Community</p>
        <h1 className="font-serif text-4xl text-foreground mb-4 leading-tight">Contributors</h1>
        <p className="text-muted-foreground leading-relaxed">
          ConvexPi is built in the open. Researchers earn reputation and badges for the work that makes
          the commons better — reference replications, paper wikis, and strategies that hold up out of
          sample. We reward intellectual honesty: finding that a famous factor is <em>dead</em> earns a
          badge of its own.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No contributions yet — be the first.
        </div>
      ) : (
        <ol className="flex flex-col divide-y divide-border border border-border rounded-lg overflow-hidden bg-card">
          {rows.map((r, i) => {
            const d = display(r)
            const badges = badgesFor(r)
            return (
              <li key={r.contributor} className="flex items-start gap-4 px-4 py-4 hover:bg-secondary/30 transition-colors">
                <span className="w-6 text-right font-mono text-sm text-muted-foreground tabular-nums mt-1.5">{i + 1}</span>
                <Avatar username={d.username ?? d.name} githubUsername={d.gh} size={36} className="mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {d.username ? (
                      <Link href={`/profile/${d.username}`} className="font-medium text-foreground hover:underline underline-offset-4">
                        {d.name}
                      </Link>
                    ) : d.gh ? (
                      <a href={`https://github.com/${d.gh}`} target="_blank" rel="noopener noreferrer"
                        className="font-medium text-foreground hover:underline underline-offset-4">{d.name}</a>
                    ) : (
                      <span className="font-medium text-foreground">{d.name}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {r.n_replications > 0 && `${r.n_replications} replication${r.n_replications > 1 ? 's' : ''} · `}
                      {r.n_wiki > 0 && `${r.n_wiki} wiki${r.n_wiki > 1 ? 's' : ''} · `}
                      {r.n_submissions > 0 && `${r.n_submissions} submission${r.n_submissions > 1 ? 's' : ''}`}
                    </span>
                  </div>
                  {badges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {badges.map(bd => (
                        <span key={bd.key} title={bd.desc}
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ring-1 ${TIER_STYLE[bd.tier]}`}>
                          {bd.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0 mt-0.5">
                  <div className="font-mono font-bold text-foreground tabular-nums">{r.reputation.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">rep</div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {/* How to earn */}
      <div className="mt-10 rounded-lg border border-border bg-secondary/40 px-6 py-6">
        <h2 className="font-serif text-xl text-foreground mb-4">How to earn reputation</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 max-w-2xl">
          {POINT_RULES.map(rule => (
            <div key={rule.action} className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5">
              <span className="text-sm text-muted-foreground">{rule.action}</span>
              <span className="font-mono text-sm font-semibold text-[#C9A34E] shrink-0">{rule.points}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 mt-5 text-sm">
          <a href="https://github.com/convexpi/replications/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer"
            className="font-medium text-[#C9A34E] hover:text-[#b8922d]">Contribute a replication ↗</a>
          <Link href="/papers" className="font-medium text-[#C9A34E] hover:text-[#b8922d]">Improve a paper wiki →</Link>
          <Link href="/compete" className="font-medium text-[#C9A34E] hover:text-[#b8922d]">Enter a competition →</Link>
        </div>
      </div>
    </div>
  )
}
