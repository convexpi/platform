import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Users — Admin' }

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const db = createAdminClient()

  let query = db
    .from('profiles')
    .select(`
      id, username, display_name, university, bio, github_username,
      created_at,
      submissions(count),
      follows_as_following:follows!follows_following_id_fkey(count)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  const { data: profiles } = await query

  type ProfileRow = {
    id: string; username: string; display_name: string | null
    university: string | null; github_username: string | null; created_at: string
    submissions: { count: number }[] | null
    follows_as_following: { count: number }[] | null
  }

  let rows = (profiles ?? []) as unknown as ProfileRow[]

  // Filter by search
  const sq = q?.toLowerCase().trim()
  if (sq) {
    rows = rows.filter(r =>
      r.username.toLowerCase().includes(sq) ||
      r.display_name?.toLowerCase().includes(sq) ||
      r.university?.toLowerCase().includes(sq) ||
      r.github_username?.toLowerCase().includes(sq)
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{rows.length} shown</p>
        </div>
        <form method="GET" className="relative">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search users…"
            className="pl-3 pr-3 py-1.5 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring w-56"
          />
        </form>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">User</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">University</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">GitHub</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Submissions</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Followers</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(r => {
              const subCount = (r.submissions as unknown as { count: number }[])?.[0]?.count ?? 0
              const followerCount = (r.follows_as_following as unknown as { count: number }[])?.[0]?.count ?? 0
              return (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/profile/${r.username}`}
                      className="font-medium hover:text-primary transition-colors">
                      {r.display_name ?? r.username}
                    </Link>
                    <p className="text-xs text-muted-foreground">@{r.username}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.university ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.github_username ? (
                      <a href={`https://github.com/${r.github_username}`}
                        target="_blank" rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors">
                        @{r.github_username}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{subCount}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{followerCount}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground tabular-nums">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
