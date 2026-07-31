import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS. Only use in admin server components/routes.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('Missing Supabase admin credentials')
  return createClient(url, key, { auth: { persistSession: false } })
}

// Same client, but null instead of throwing when the service role isn't configured. Public pages
// should degrade to their static shell rather than 500 on a deploy that's missing the key.
export function tryCreateAdminClient() {
  try {
    return createAdminClient()
  } catch {
    return null
  }
}

export function isAdmin(userId: string): boolean {
  const ids = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  return ids.includes(userId)
}
