/**
 * Simple per-user in-memory rate limiter.
 *
 * Works well for a single-instance deployment (Railway, small Vercel functions).
 * For multi-instance / edge deployments, swap the Map for Upstash Redis:
 *   https://github.com/upstash/ratelimit-js
 *
 * Usage:
 *   const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60_000 })
 *   const result  = limiter.check(userId)
 *   if (!result.ok) return NextResponse.json({ error: result.error }, { status: 429 })
 */

interface Window {
  count: number
  resetAt: number
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
  error?: string
}

export class RateLimiter {
  private readonly maxRequests: number
  private readonly windowMs: number
  private readonly store = new Map<string, Window>()

  constructor({ maxRequests = 5, windowMs = 60_000 }: { maxRequests?: number; windowMs?: number } = {}) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  check(key: string): RateLimitResult {
    const now = Date.now()
    let win = this.store.get(key)

    if (!win || now >= win.resetAt) {
      win = { count: 0, resetAt: now + this.windowMs }
      this.store.set(key, win)
    }

    win.count++

    if (win.count > this.maxRequests) {
      const retryAfterSecs = Math.ceil((win.resetAt - now) / 1000)
      return {
        ok: false,
        remaining: 0,
        resetAt: win.resetAt,
        error: `Too many submissions. Try again in ${retryAfterSecs}s.`,
      }
    }

    return { ok: true, remaining: this.maxRequests - win.count, resetAt: win.resetAt }
  }

  /** Prune expired windows — call periodically to avoid unbounded growth. */
  cleanup(): void {
    const now = Date.now()
    for (const [key, win] of this.store) {
      if (now >= win.resetAt) this.store.delete(key)
    }
  }
}

// Singleton: 5 submissions per user per minute
export const submissionLimiter = new RateLimiter({ maxRequests: 5, windowMs: 60_000 })
