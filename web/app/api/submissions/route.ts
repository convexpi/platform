import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { validateSubmission } from '@/lib/safety'
import { submissionLimiter } from '@/lib/rate-limit'

const MAX_CODE_BYTES = 50_000   // 50 KB — generous for any real strategy

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 5 submissions per user per minute
  const rateResult = submissionLimiter.check(user.id)
  if (!rateResult.ok) {
    return NextResponse.json({ error: rateResult.error }, { status: 429 })
  }

  const body = await request.json()
  const { cohortId, strategyName, code, githubUrl } = body

  if (!cohortId || !strategyName || !code) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Input size cap
  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
    return NextResponse.json(
      { error: `Code exceeds the ${MAX_CODE_BYTES / 1000} KB limit.` },
      { status: 400 }
    )
  }

  const validation = validateSubmission(code)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  // Deduplication: reject identical code submitted within 10 minutes
  const dedupeWindow = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from('submissions')
    .select('id')
    .eq('user_id', user.id)
    .eq('cohort_id', cohortId)
    .eq('code', code)
    .gte('submitted_at', dedupeWindow)
    .limit(1)

  if (recent && recent.length > 0) {
    return NextResponse.json(
      { error: 'Identical strategy submitted recently. Make a change before resubmitting.' },
      { status: 409 }
    )
  }

  const { data: submission, error } = await supabase
    .from('submissions')
    .insert({
      cohort_id: cohortId,
      user_id: user.id,
      strategy_name: strategyName,
      code,
      ...(githubUrl ? { github_url: githubUrl } : {}),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ submission })
}
