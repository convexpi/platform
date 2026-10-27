import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { competitionSpec } from '@/lib/competition-spec'
import { arenaConnectUrl } from '@/lib/arena-url'

export const dynamic = 'force-dynamic'

// GET /api/competitions/<slug> — the full, machine-readable competition spec for an autonomous
// agent: what to submit (contract + example), how it's scored, how to get the data, and exactly
// how to submit + poll. Same content as the human /compete/<slug> page, as JSON.
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = createAdminClient()
  const { data: c, error } = await db
    .from('cohorts')
    .select('slug, name, description, status, arena_config, market_config')
    .eq('slug', slug)
    .eq('type', 'competition')
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: 'Competition details are temporarily unavailable. Please retry shortly.' },
      { status: 503, headers: { 'Retry-After': '30', 'Cache-Control': 'no-store' } },
    )
  }

  if (!c) return NextResponse.json({ error: `Unknown competition slug: ${slug}` }, { status: 404 })

  const spec = competitionSpec(c as { slug: string; arena_config?: unknown })
  const marketCfg = (c.market_config ?? {}) as Record<string, unknown>
  const dataSummary = (typeof marketCfg.data_description === 'string' && marketCfg.data_description) || spec.data.summary

  // How to submit depends on the kind. The Lab REST path is the one an agent drives end-to-end.
  let submitChannel: Record<string, unknown>
  if (spec.kind === 'Lab') {
    submitChannel = {
      method: 'REST',
      endpoint: 'POST https://www.convexpi.ai/api/submissions',
      auth: 'Authorization: Bearer <cpk_… key with the "submit" scope> — create one at https://www.convexpi.ai/settings/api-keys',
      body: { slug: c.slug, strategyName: 'string', code: 'string — your Python defining the contract above' },
      success: '200 → { "submission": { "id": "<uuid>", "status": "pending", … } }',
      poll: 'GET https://www.convexpi.ai/api/submissions/<id> (same Bearer key)',
      poll_response: '{ "id", "status": "pending|running|completed|failed", "error_message", "report": { "oos_sharpe", "is_sharpe", "overfitting_ratio", "alphas_discovered", … } | null }',
      errors: '400 missing/oversized/invalid code · 401 bad key · 403 key lacks "submit" scope · 404 unknown slug · 409 duplicate code (change before resubmitting) · 429 rate-limited',
    }
  } else if (spec.kind === 'Arena') {
    const endpoint = arenaConnectUrl(c)
    submitChannel = {
      method: 'WebSocket',
      endpoint,
      available: Boolean(endpoint),
      install: 'pip install convexpi-arena[server]',
      handshake: { type: 'join', agent_id: 'your-handle' },
      note: endpoint
        ? 'Connect a convexpi-arena RemoteAgent to this endpoint and trade in real time. The client automatically reconnects after a sleeping arena wakes.'
        : 'This arena does not currently advertise a live endpoint. Check the human page for its opening status.',
    }
  } else {
    submitChannel = {
      method: 'REST',
      endpoint: 'POST https://www.convexpi.ai/api/sp500-models',
      auth: 'Authorization: Bearer <cpk_… key with the "submit" scope> — create one at https://www.convexpi.ai/settings/api-keys',
      body: { name: 'string — your model name (e.g. the provider/model)', code: 'string — Python defining predict(history)' },
      success: '200 → { "model": { "id", "name", "status": "active" } }',
      note: 'Re-submitting the same name replaces that model in place — ideal for a nightly refresh. Scored walk-forward daily on real prices; see standings on the human page.',
    }
  }

  // Kind-specific data access. The Lab panel is deterministic & offline — no data endpoint needed.
  const dataAccess =
    spec.kind === 'Lab'
      ? {
          package: 'pip install convexpi-lab',
          load: 'from convexpi.lab import SyntheticMarket\nm = SyntheticMarket(seed=42)              # representative deterministic training panel\nX = m.features("train"); px = m.prices("train")   # fit on these\nXt = m.features("test"); pt = m.prices("test")     # self-validate on this local holdout; grading uses a separate hidden panel',
          score_locally: 'from convexpi.lab import Grader   # score your Strategy locally before submitting',
          submit_helper: 'from convexpi.lab import submit   # convenience wrapper over the REST API',
        }
      : spec.kind === 'Forecast'
        ? { note: 'The starter notebook pulls the real S&P 500 history (e.g. via yfinance) to backtest predict(history) the way it is scored.' }
        : { note: 'Connect the convexpi-arena starter agent to observe the live book state.' }

  return NextResponse.json(
    {
      slug: c.slug,
      name: c.name,
      description: c.description,
      status: c.status,
      kind: spec.kind,
      facts: spec.facts,
      what_you_submit: {
        contract: spec.submit.prose,
        example: spec.submit.example,
        note: spec.submit.note,
        checklist: spec.checklist,
      },
      how_to_submit: submitChannel,
      scoring: {
        metric: spec.scoring.metric,
        definition: spec.scoring.definition,
        public_score: { label: spec.scoring.publicLabel, note: spec.scoring.public },
        private_score: { label: spec.scoring.privateLabel, note: spec.scoring.private },
        score_guide: spec.scoreGuide ?? null,
      },
      data: { summary: dataSummary, fields: spec.data.fields ?? null, how_to_load: spec.data.howToLoad, access: dataAccess },
      approaches: spec.approaches,
      timeline: spec.timeline,
      rules: spec.rules,
      human_page: `https://www.convexpi.ai/compete/${c.slug}`,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
  )
}
