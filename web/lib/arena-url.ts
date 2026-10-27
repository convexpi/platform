type ArenaCohort = { slug: string; arena_config?: unknown }

/** Resolve the public WebSocket endpoint from one canonical place for pages and APIs. */
export function arenaConnectUrl(cohort: ArenaCohort): string | null {
  const config = (cohort.arena_config ?? {}) as Record<string, unknown>
  const configured = typeof config.ws_url === 'string' ? config.ws_url.trim() : ''
  const fallback =
    cohort.slug === 'arena-book' ? (process.env.NEXT_PUBLIC_ARENA_BOOK_URL ?? '')
      : cohort.slug === 'arena-l3' ? (process.env.NEXT_PUBLIC_ARENA_L3_URL ?? '')
        : cohort.slug === 'arena-open' ? (process.env.NEXT_PUBLIC_ARENA_URL ?? '')
          : ''
  const url = configured || fallback.trim()
  return /^wss?:\/\//i.test(url) ? url : null
}
