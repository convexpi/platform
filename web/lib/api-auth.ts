import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashApiKey, looksLikeApiKey } from '@/lib/api-keys'

export interface ResolvedKey {
  id: string
  name: string
  kind: 'user' | 'agent'
  scopes: string[]
}

export interface ResolvedUser {
  userId: string
  /** 'web' for cookie sessions; the key's kind ('user'|'agent') for API keys. */
  via: 'web' | 'api' | 'agent'
  key?: ResolvedKey
}

/**
 * Resolve the acting user from a request, accepting either a browser cookie
 * session OR an `Authorization: Bearer cpk_…` API key. API-key lookup uses the
 * service role (RLS-bypassing) purely to match the key hash; it never returns
 * the hash to the caller. Returns null if neither auth method succeeds.
 */
export async function resolveRequestUser(request: Request): Promise<ResolvedUser | null> {
  // 1. Bearer API key
  const auth = request.headers.get('authorization') ?? request.headers.get('Authorization')
  const bearer = auth?.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : null

  if (looksLikeApiKey(bearer)) {
    const admin = createAdminClient()
    const { data: key } = await admin
      .from('api_keys')
      .select('id, user_id, name, kind, scopes, revoked_at')
      .eq('key_hash', hashApiKey(bearer!))
      .is('revoked_at', null)
      .maybeSingle()

    if (!key) return null

    // Best-effort touch of last_used_at (don't block on it).
    admin.from('api_keys').update({ last_used_at: new Date().toISOString() })
      .eq('id', key.id).then(() => {}, () => {})

    return {
      userId: key.user_id,
      via: key.kind === 'agent' ? 'agent' : 'api',
      key: { id: key.id, name: key.name, kind: key.kind, scopes: key.scopes ?? [] },
    }
  }

  // 2. Browser cookie session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return { userId: user.id, via: 'web' }

  return null
}

export function hasScope(resolved: ResolvedUser, scope: string): boolean {
  // Cookie sessions have full access; API keys are limited to their scopes.
  if (resolved.via === 'web') return true
  return resolved.key?.scopes?.includes(scope) ?? false
}
