import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'
import { setCohortStatus, setCohortVisibility } from './actions'

function ActBtn({ action, id, field, value, label, cls = '' }: {
  action: (fd: FormData) => void; id: string; field: string; value: string; label: string; cls?: string
}) {
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name={field} value={value} />
      <button type="submit" className={`underline underline-offset-2 hover:text-foreground ${cls}`}>{label}</button>
    </form>
  )
}

export const metadata: Metadata = { title: 'Cohorts — Admin' }

export default async function AdminCohorts() {
  const db = createAdminClient()

  // cohorts.owner_id references auth.users (not profiles), so we can't use
  // a PostgREST embedded join to get the owner's username. Instead, fetch
  // cohorts without the owner join, then look up profiles separately by id.
  const [
    { data: cohortData, error: cohortErr },
    { data: memberRows },
    { data: subRows },
  ] = await Promise.all([
    db
      .from('cohorts')
      .select('id, slug, name, type, visibility, status, created_at, start_date, end_date, owner_id')
      .order('created_at', { ascending: false }),
    db.from('cohort_members').select('cohort_id'),
    db.from('submissions').select('cohort_id'),
  ])

  if (cohortErr) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-2">Cohorts</h1>
        <p className="text-sm text-red-600 font-mono bg-red-50 p-4 rounded-lg">
          Error: {cohortErr.message}
        </p>
      </div>
    )
  }

  // Count members and submissions per cohort
  const memberCount: Record<string, number> = {}
  for (const m of memberRows ?? []) {
    memberCount[m.cohort_id] = (memberCount[m.cohort_id] ?? 0) + 1
  }
  const subCount: Record<string, number> = {}
  for (const s of subRows ?? []) {
    subCount[s.cohort_id] = (subCount[s.cohort_id] ?? 0) + 1
  }

  // Fetch owner usernames (profiles.id = auth.users.id = cohorts.owner_id)
  const ownerIds = [...new Set((cohortData ?? []).map(c => c.owner_id).filter(Boolean))]
  const { data: ownerProfiles } = ownerIds.length
    ? await db.from('profiles').select('id, username').in('id', ownerIds)
    : { data: [] }
  const ownerUsername: Record<string, string> = {}
  for (const p of ownerProfiles ?? []) ownerUsername[p.id] = p.username

  type CohortRow = {
    id: string; slug: string; name: string; type: string; visibility: string
    status: string; created_at: string; start_date: string | null
    end_date: string | null; owner_id: string
  }

  const rows = (cohortData ?? []) as CohortRow[]

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
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(c => {
              const base = c.type === 'competition' ? '/compete' : '/classroom'
              const owner = ownerUsername[c.owner_id]
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
                    {owner ? (
                      <Link href={`/profile/${owner}`}
                        className="hover:text-foreground transition-colors">
                        @{owner}
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
                  <td className="px-4 py-3 text-right font-mono text-xs">{memberCount[c.id] ?? 0}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{subCount[c.id] ?? 0}</td>
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
                  <td className="px-4 py-3 text-right whitespace-nowrap text-[11px] text-muted-foreground space-x-2">
                    {c.status !== 'active'  && <ActBtn action={setCohortStatus} id={c.id} field="status" value="active"  label="start" cls="text-emerald-700" />}
                    {c.status !== 'ended'   && <ActBtn action={setCohortStatus} id={c.id} field="status" value="ended"  label="end" />}
                    <ActBtn action={setCohortVisibility} id={c.id} field="visibility"
                      value={c.visibility === 'public' ? 'private' : 'public'}
                      label={c.visibility === 'public' ? 'hide' : 'publish'} />
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">No cohorts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
