import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser, hasScope } from '@/lib/api-auth'
import { validateForLanguage } from '@/lib/safety'
import { submissionLimiter } from '@/lib/rate-limit'

const MAX_CODE_BYTES = 50_000   // 50 KB — generous for any real strategy

export async function POST(request: Request) {
  // Accepts either a browser cookie session or an `Authorization: Bearer cpk_…`
  // API key. Same validation / dedup / rate-limit / insert for every path, so
  // the web editor, the notebook helper, and AI agents can't diverge.
  const actor = await resolveRequestUser(request)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasScope(actor, 'submit')) {
    return NextResponse.json({ error: 'This API key lacks the "submit" scope.' }, { status: 403 })
  }

  // Rate limit: 5 submissions per user per minute (shared across all keys).
  const rateResult = submissionLimiter.check(actor.userId)
  if (!rateResult.ok) {
    return NextResponse.json({ error: rateResult.error }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const { cohortId, slug, strategyName, code, githubUrl } = body
  const language = String(body.language ?? 'python').toLowerCase()

  if ((!cohortId && !slug) || !strategyName || !code) {
    return NextResponse.json(
      { error: 'Missing required fields: (cohortId or slug), strategyName, code' },
      { status: 400 },
    )
  }

  if (!['python', 'r', 'julia'].includes(language)) {
    return NextResponse.json({ error: `Unsupported language: ${language} (python | r | julia).` }, { status: 400 })
  }

  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
    return NextResponse.json(
      { error: `Code exceeds the ${MAX_CODE_BYTES / 1000} KB limit.` },
      { status: 400 },
    )
  }

  const validation = validateForLanguage(code, language)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  // We use the service client for reads/writes and scope every query by the
  // authenticated user id — RLS is not relied on here because API-key callers
  // have no Supabase session.
  const db = createAdminClient()

  // Resolve competition slug → cohort id (ergonomic for programmatic callers).
  let resolvedCohortId = cohortId as string | undefined
  if (!resolvedCohortId && slug) {
    const { data: cohort } = await db
      .from('cohorts')
      .select('id, status')
      .eq('slug', slug)
      .maybeSingle()
    if (!cohort) {
      return NextResponse.json({ error: `Unknown competition slug: ${slug}` }, { status: 404 })
    }
    resolvedCohortId = cohort.id
  }

  // Deduplication: reject identical code submitted within 10 minutes.
  const dedupeWindow = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data: recent } = await db
    .from('submissions')
    .select('id')
    .eq('user_id', actor.userId)
    .eq('cohort_id', resolvedCohortId!)
    .eq('code', code)
    .gte('submitted_at', dedupeWindow)
    .limit(1)

  if (recent && recent.length > 0) {
    return NextResponse.json(
      { error: 'Identical strategy submitted recently. Make a change before resubmitting.' },
      { status: 409 },
    )
  }

  const { data: submission, error } = await db
    .from('submissions')
    .insert({
      cohort_id: resolvedCohortId,
      user_id: actor.userId,
      strategy_name: strategyName,
      code,
      language,
      submitted_via: actor.via,
      ...(actor.via === 'agent' ? { agent_name: actor.key?.name } : {}),
      ...(githubUrl ? { github_url: githubUrl } : {}),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-enroll competitors so the competition shows on their dashboard (and they get member-level
  // read access to its board). Competitions only — classroom membership is managed explicitly.
  const { data: cohortMeta } = await db.from('cohorts').select('type').eq('id', resolvedCohortId!).maybeSingle()
  if (cohortMeta?.type === 'competition') {
    const { data: member } = await db.from('cohort_members')
      .select('id').eq('cohort_id', resolvedCohortId!).eq('user_id', actor.userId).maybeSingle()
    if (!member) {
      await db.from('cohort_members').insert({ cohort_id: resolvedCohortId, user_id: actor.userId, role: 'member' })
    }
  }

  return NextResponse.json({ submission })
}
