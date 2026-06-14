import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Arena Seasons — ConvexPi' }

type SeasonRow = {
  id: string
  season_name: string
  description: string | null
  status: string
  started_at: string
  ended_at: string | null
  cohort_id: string
  cohorts: { name: string; slug: string; visibility: string } | null
}

type Ranking = {
  agent_id: string
  user_id: string | null
  pnl_cents: number
  position: number
  profiles: { display_name: string | null; username: string } | null
}

export default async function SeasonsPage() {
  const supabase = await createClient()

  // Only show sessions from public cohorts
  const { data: rawSessions } = await supabase
    .from('arena_sessions')
    .select('id, season_name, description, status, started_at, ended_at, cohort_id, cohorts(name, slug, visibility)')
    .order('started_at', { ascending: false })

  const sessions = ((rawSessions ?? []) as unknown as SeasonRow[]).filter(
    s => s.cohorts?.visibility === 'public'
  )

  // Fetch top-3 rankings for each ended session
  const endedIds = sessions.filter(s => s.status === 'ended').map(s => s.id)

  const rankingsBySession = new Map<string, Ranking[]>()
  for (const sid of endedIds) {
    const { data } = await supabase
      .from('arena_rankings')
      .select('agent_id, user_id, pnl_cents, position')
      .eq('session_id', sid)
      .order('pnl_cents', { ascending: false })
      .limit(3)
    if (data && data.length > 0) {
      // Fetch display names separately
      const userIds = (data as Ranking[]).map(r => r.user_id).filter(Boolean) as string[]
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('id, display_name, username').in('id', userIds)
        : { data: [] }
      const profMap = new Map((profiles ?? []).map((p: { id: string; display_name: string | null; username: string }) => [p.id, p]))
      rankingsBySession.set(
        sid,
        (data as Ranking[]).map(r => ({
          ...r,
          profiles: r.user_id ? (profMap.get(r.user_id) ?? null) : null,
        }))
      )
    }
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Arena Seasons</h1>
        <p className="text-muted-foreground mt-1">
          Public competition seasons and final leaderboards.
        </p>
      </div>

      {sessions.length === 0 && (
        <p className="text-muted-foreground text-sm">No public seasons yet.</p>
      )}

      <div className="space-y-6">
        {sessions.map(s => {
          const top = rankingsBySession.get(s.id) ?? []
          return (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-lg">{s.season_name}</CardTitle>
                    {s.cohorts && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.cohorts.name}
                      </p>
                    )}
                    {s.description && (
                      <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={s.status === 'active' ? 'default' : 'outline'}>
                      {s.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.started_at).toLocaleDateString()}
                      {s.ended_at ? ` – ${new Date(s.ended_at).toLocaleDateString()}` : ' – present'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              {top.length > 0 && (
                <CardContent>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Final standings
                  </p>
                  <ol className="space-y-1">
                    {top.map((r, i) => {
                      const name = r.profiles?.display_name ?? r.profiles?.username ?? r.agent_id
                      return (
                        <li key={r.agent_id} className="flex items-center gap-3 text-sm">
                          <span className="text-lg w-6 shrink-0">{medals[i] ?? `${i + 1}.`}</span>
                          <span className="font-medium flex-1">{name}</span>
                          <span className="font-mono text-muted-foreground">
                            ${(r.pnl_cents / 100).toFixed(2)}
                          </span>
                        </li>
                      )
                    })}
                  </ol>
                </CardContent>
              )}
              {s.status === 'active' && s.cohorts && (
                <CardContent className="pt-0">
                  <Link
                    href={`/compete/${s.cohorts.slug}`}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    Join live arena →
                  </Link>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
