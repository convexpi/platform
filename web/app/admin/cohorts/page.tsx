import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Cohorts — Admin' }

export default async function AdminCohorts() {
  const db = createAdminClient()

  const { data } = await db
    .from('cohorts')
    .select(`
      id, slug, name, type, visibility, status, created_at,
      start_date, end_date,
      profiles!cohorts_owner_id_fkey(username),
      cohort_members(count),
      submissions(count)
    `)
    .order('created_at', { ascending: false })

  type CohortRow = {
    id: string; slug: string; name: string; type: string; visibility: string
    status: string; created_at: string; start_date: string | null; end_date: string | null
    profiles: { username: string } | null
    cohort_members: { count: number }[] | null
    submissions: { count: number }[] | null
  }

  const rows = (data ?? []) as unknown as CohortRow[]

  const typeStyle: Record<string, string> = {
    competition: 'bg-[#C9A34E]/10 text-[#C9A34E]',
    classroom:   'bg-blue-50 text-blue-600',
  }
  const statusStyle: Record<string, string> = {
    active:   'bg-emerald-50 text-emerald-700',
    upcoming: 'bg-amber-50 text-amber-700',
    ended:    'bg-secondary text-muted-foreground',
  }
  const visStyle: Record<string, string> = {
    public:  'text-emerald-600',
    private: 'text-muted-foreground',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Cohorts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{rows.length} total</p>
        </div>
        <Link href="/compete/new"
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          + New cohort
        </Link>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Owner</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Dates</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Members</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Submissions</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Vis</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(c => {
              const base = c.type === 'competition' ? '/compete' : '/classroom'
              const memberCount = (c.cohort_members as unknown as { count: number }[])?.[0]?.count ?? 0
              const subCount = (c.submissions as unknown as { count: number }[])?.[0]?.count ?? 0
              return (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`${base}/${c.slug}`}
                      className="font-medium hover:text-primary transition-colors">
                      {c.name}
                    </Link>
                    <p className="text-xs text-muted-foreground font-mono">{c.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeStyle[c.type] ?? ''}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.profiles?.username ? (
                      <Link href={`/profile/${c.profiles.username}`}
                        className="hover:text-foreground transition-colors">
                        @{c.profiles.username}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.start_date ? (
                      <span>
                        {new Date(c.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' – '}
                        {c.end_date
                          ? new Date(c.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'ongoing'}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{memberCount}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{subCount}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle[c.status] ?? ''}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-medium ${visStyle[c.visibility] ?? ''}`}>
                      {c.visibility}
                    </span>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">No cohorts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
