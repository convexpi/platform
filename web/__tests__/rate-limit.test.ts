import { describe, it, expect, vi, afterEach } from 'vitest'
import { RateLimiter } from '@/lib/rate-limit'

describe('RateLimiter', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests within the limit', () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 60_000 })
    expect(limiter.check('user-1').ok).toBe(true)
    expect(limiter.check('user-1').ok).toBe(true)
    expect(limiter.check('user-1').ok).toBe(true)
  })

  it('blocks the request that exceeds the limit', () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60_000 })
    limiter.check('u')
    limiter.check('u')
    const result = limiter.check('u')
    expect(result.ok).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.error).toMatch(/Too many/)
  })

  it('tracks users independently', () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60_000 })
    limiter.check('alice')
    limiter.check('alice')  // blocked
    expect(limiter.check('bob').ok).toBe(true)
  })

  it('resets the window after windowMs has elapsed', () => {
    vi.useFakeTimers()
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1_000 })
    limiter.check('u')
    expect(limiter.check('u').ok).toBe(false)

    vi.advanceTimersByTime(1_001)
    expect(limiter.check('u').ok).toBe(true)
  })

  it('returns the correct remaining count', () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60_000 })
    expect(limiter.check('u').remaining).toBe(4)
    expect(limiter.check('u').remaining).toBe(3)
    expect(limiter.check('u').remaining).toBe(2)
  })

  it('cleanup() removes expired windows', () => {
    vi.useFakeTimers()
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1_000 })
    limiter.check('u')
    vi.advanceTimersByTime(1_001)
    limiter.cleanup()
    // After cleanup, window resets → first request allowed
    expect(limiter.check('u').remaining).toBe(4)
  })

  it('includes error message with retry time when blocked', () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60_000 })
    limiter.check('u')
    const result = limiter.check('u')
    expect(result.error).toMatch(/\d+s/)
  })
})
