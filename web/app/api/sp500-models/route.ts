import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser, hasScope } from '@/lib/api-auth'
import { findBlockedPattern } from '@/lib/safety'
import { submissionLimiter } from '@/lib/rate-limit'

const MAX_CODE_BYTES = 20_000

// POST /api/sp500-models — submit a predict(history) forecast model for the S&P next-day
// competition, programmatically. Mirrors the web editor's server action, with API-key auth, so
// AI agents can compete on the forecast too. (Lab strategies use POST /api/submissions.)
export async function POST(request: Request) {
  const actor = await resolveRequestUser(request)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasScope(actor, 'submit')) {
    return NextResponse.json({ error: 'This API key lacks the "submit" scope.' }, { status: 403 })
  }

  const rate = submissionLimiter.check(actor.userId)
  if (!rate.ok) return NextResponse.json({ error: rate.error }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const name = String(body.name ?? '').trim().slice(0, 80)
  const code = String(body.code ?? '').trim()

  if (!name || !code) {
    return NextResponse.json({ error: 'Missing required fields: name, code' }, { status: 400 })
  }
  if (!code.includes('def predict')) {
    return NextResponse.json({ error: 'Code must define predict(history).' }, { status: 400 })
  }
  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
    return NextResponse.json({ error: `Code exceeds the ${MAX_CODE_BYTES / 1000} KB limit.` }, { status: 400 })
  }
  const blocked = findBlockedPattern(code)
  if (blocked) {
    return NextResponse.json({ error: `Blocked import or call: "${blocked}". Forecasts run sandboxed.` }, { status: 400 })
  }

  const db = createAdminClient()

  // Stable identity per (user, name): keep ONE persistent model row and refresh its code in place.
  // The forward track (sp500_forecasts / sp500_scores) keys off the model id, so a nightly re-submit
  // must reuse the same id to keep accumulating a continuous record — minting a new id every day
  // fragments the track ("can't link one day to the next"). Collapse any pre-existing duplicates
  // onto the oldest surviving row.
  const { data: actives } = await db
    .from('sp500_models')
    .select('id')
    .eq('user_id', actor.userId).eq('name', name).eq('status', 'active')
    .order('created_at', { ascending: true })

  let model: { id: string; name: string; status: string; created_at: string } | null = null
  let error: { message: string } | null = null
  if (actives && actives.length > 0) {
    const keepId = actives[0].id
    if (actives.length > 1) {
      await db.from('sp500_models').update({ status: 'disabled' })
        .in('id', actives.slice(1).map((a) => a.id))
    }
    ;({ data: model, error } = await db.from('sp500_models')
      .update({ code })
      .eq('id', keepId)
      .select('id, name, status, created_at').single())
  } else {
    ;({ data: model, error } = await db.from('sp500_models')
      .insert({ user_id: actor.userId, name, code, status: 'active' })
      .select('id, name, status, created_at').single())
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    model,
    note: 'Scored walk-forward on real prices and re-scored daily. See standings at /compete/sp500-nextday.',
  })
}
