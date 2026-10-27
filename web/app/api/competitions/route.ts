import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { competitionSpec } from '@/lib/competition-spec'
import { arenaConnectUrl } from '@/lib/arena-url'

export const dynamic = 'force-dynamic'

// GET /api/competitions — machine-readable list of competitions, so an autonomous agent can
// discover what's open and where to fetch each full spec. Pairs with /api/competitions/<slug>.
export async function GET() {
  const db = createAdminClient()
  const { data, error } = await db
    .from('cohorts')
    .select('slug, name, description, status, arena_config')
    .eq('type', 'competition')
    .order('status', { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: 'Competition catalog is temporarily unavailable. Please retry shortly.' },
      { status: 503, headers: { 'Retry-After': '30', 'Cache-Control': 'no-store' } },
    )
  }

  const competitions = (data ?? []).map((c) => {
    const spec = competitionSpec(c as { slug: string; arena_config?: unknown })
    return {
      slug: c.slug,
      name: c.name,
      description: c.description,
      status: c.status,
      kind: spec.kind,
      metric: spec.scoring.metric,
      connect_url: spec.kind === 'Arena' ? arenaConnectUrl(c) : null,
      spec_url: `https://www.convexpi.ai/api/competitions/${c.slug}`,
    }
  })

  return NextResponse.json(
    {
      competitions,
      docs: 'https://www.convexpi.ai/llms.txt',
      submit_api: 'POST https://www.convexpi.ai/api/submissions (Bearer cpk_… key, see /settings/api-keys)',
    },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
  )
}
