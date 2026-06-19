import { createHash, randomBytes } from 'crypto'

// Personal/agent API keys for the submission API.
// Format: cpk_live_<40 hex chars>. Only the SHA-256 hash is stored server-side.

const KEY_PREFIX = 'cpk_live_'

export interface GeneratedKey {
  /** The full secret — shown to the user exactly once, never stored. */
  full: string
  /** SHA-256 hex of the full key — what we persist. */
  hash: string
  /** Display prefix, e.g. cpk_live_a1b2c3d4 — safe to store and show. */
  prefix: string
}

export function generateApiKey(): GeneratedKey {
  const secret = randomBytes(20).toString('hex') // 40 hex chars
  const full = `${KEY_PREFIX}${secret}`
  return {
    full,
    hash: hashApiKey(full),
    prefix: full.slice(0, KEY_PREFIX.length + 8), // cpk_live_ + first 8
  }
}

export function hashApiKey(full: string): string {
  return createHash('sha256').update(full).digest('hex')
}

export function looksLikeApiKey(value: string | null | undefined): boolean {
  return !!value && value.startsWith(KEY_PREFIX)
}
