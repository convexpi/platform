import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/api-keys'

// List the current user's API keys (metadata only — never the secret).
export async function GET() {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await db
    .from('api_keys')
    .select('id, name, kind, key_prefix, scopes, created_at, last_used_at, revoked_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ keys: data ?? [] })
}

// Create a new key. The full secret is returned ONCE and never stored.
export async function POST(request: Request) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const name = (body.name ?? '').trim()
  const kind = body.kind === 'agent' ? 'agent' : 'user'
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  // Cap keys per user to limit abuse.
  const { count } = await db
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('revoked_at', null)
  if ((count ?? 0) >= 20) {
    return NextResponse.json({ error: 'Key limit reached (20). Revoke unused keys.' }, { status: 400 })
  }

  const key = generateApiKey()
  const { data, error } = await db
    .from('api_keys')
    .insert({
      user_id: user.id,
      name,
      kind,
      key_hash: key.hash,
      key_prefix: key.prefix,
    })
    .select('id, name, kind, key_prefix, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // `full` is returned exactly once — the client must show it now.
  return NextResponse.json({ key: data, secret: key.full })
}
