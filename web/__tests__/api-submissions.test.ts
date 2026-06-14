/**
 * Tests for POST /api/submissions
 *
 * Strategy: mock Supabase and next/headers so we can call the route handler
 * directly and assert on the JSON responses, without a running server.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be defined before the import that uses them
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()
const mockInsert = vi.fn()
// Controls the deduplication query result (default: no recent duplicates)
const mockDedupe = vi.fn().mockResolvedValue({ data: [], error: null })

// Chainable builder for the deduplication query:
// .from('submissions').select('id').eq().eq().eq().gte().limit()
function makeDedupeChain() {
  const chain: Record<string, unknown> = {}
  const q = () => chain
  chain.select = q; chain.eq = q; chain.gte = q
  chain.limit = mockDedupe
  return chain
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === 'submissions') {
        // Returns deduplication chain; insert chain hangs off of it too
        return {
          ...makeDedupeChain(),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: mockInsert,
            })),
          })),
        }
      }
      return {}
    }),
  })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({ getAll: () => [], set: () => {} })
  ),
}))

vi.mock('@/lib/rate-limit', () => {
  const check = vi.fn().mockReturnValue({ ok: true, remaining: 4, resetAt: Date.now() + 60000 })
  return {
    RateLimiter: vi.fn(() => ({ check })),
    submissionLimiter: { check },
  }
})

// Import after mocks are registered
import { POST } from '@/app/api/submissions/route'
import { submissionLimiter } from '@/lib/rate-limit'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_CODE = `
import numpy as np
from convexpi.lab.backtest import Strategy

class MyStrategy(Strategy):
    def on_day(self, day, features, prices, portfolio):
        return np.zeros(len(prices))
`

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function callPOST(body: Record<string, unknown>) {
  const res = await POST(makeRequest(body))
  const json = await res.json()
  return { status: res.status, json }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/submissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: authenticated user
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })
    // Default: successful insert
    mockInsert.mockResolvedValue({ data: { id: 'sub-1', strategy_name: 'Test' }, error: null })
    // Default: no recent duplicate
    mockDedupe.mockResolvedValue({ data: [], error: null })
    // Default: rate limit not exceeded
    ;(submissionLimiter.check as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: true, remaining: 4, resetAt: Date.now() + 60000,
    })
  })

  // ---- Auth ---------------------------------------------------------------

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const { status, json } = await callPOST({
      cohortId: 'c1', strategyName: 'Test', code: VALID_CODE,
    })
    expect(status).toBe(401)
    expect(json.error).toMatch(/Unauthorized/i)
  })

  // ---- Required fields ----------------------------------------------------

  it('returns 400 when cohortId is missing', async () => {
    const { status, json } = await callPOST({ strategyName: 'Test', code: VALID_CODE })
    expect(status).toBe(400)
    expect(json.error).toMatch(/Missing required fields/i)
  })

  it('returns 400 when strategyName is missing', async () => {
    const { status, json } = await callPOST({ cohortId: 'c1', code: VALID_CODE })
    expect(status).toBe(400)
    expect(json.error).toMatch(/Missing required fields/i)
  })

  it('returns 400 when code is missing', async () => {
    const { status, json } = await callPOST({ cohortId: 'c1', strategyName: 'Test' })
    expect(status).toBe(400)
    expect(json.error).toMatch(/Missing required fields/i)
  })

  it('returns 400 when code is empty string', async () => {
    const { status, json } = await callPOST({ cohortId: 'c1', strategyName: 'Test', code: '' })
    // Empty string is falsy → caught by missing-fields check
    expect(status).toBe(400)
  })

  // ---- Safety checks ------------------------------------------------------

  it('returns 400 for "import os" in code', async () => {
    const code = 'import os\nclass MyStrategy: pass'
    const { status, json } = await callPOST({ cohortId: 'c1', strategyName: 'Test', code })
    expect(status).toBe(400)
    expect(json.error).toMatch(/Blocked/)
    expect(json.error).toContain('"import os"')
  })

  it('returns 400 for "import sys" in code', async () => {
    const { status } = await callPOST({
      cohortId: 'c1', strategyName: 'Test', code: 'import sys\nclass MyStrategy: pass',
    })
    expect(status).toBe(400)
  })

  it('returns 400 for "eval(" in code', async () => {
    const { status, json } = await callPOST({
      cohortId: 'c1', strategyName: 'Test',
      code: 'eval("x")\nclass MyStrategy: pass',
    })
    expect(status).toBe(400)
    expect(json.error).toMatch(/Blocked/)
  })

  it('returns 400 when MyStrategy class is absent', async () => {
    const code = 'import numpy as np\ndef my_fn(): pass'
    const { status, json } = await callPOST({ cohortId: 'c1', strategyName: 'Test', code })
    expect(status).toBe(400)
    expect(json.error).toMatch(/MyStrategy/)
  })

  // ---- Happy path ---------------------------------------------------------

  it('returns 200 with submission data for valid input', async () => {
    const { status, json } = await callPOST({
      cohortId: 'c1', strategyName: 'My Momentum', code: VALID_CODE,
    })
    expect(status).toBe(200)
    expect(json.submission).toBeDefined()
  })

  // ---- Rate limiting ------------------------------------------------------

  it('returns 429 when rate limit is exceeded', async () => {
    ;(submissionLimiter.check as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: false, remaining: 0, resetAt: Date.now() + 30000, error: 'Too many submissions. Try again in 30s.',
    })
    const { status, json } = await callPOST({
      cohortId: 'c1', strategyName: 'Test', code: VALID_CODE,
    })
    expect(status).toBe(429)
    expect(json.error).toMatch(/Too many submissions/)
  })

  // ---- Input size cap -----------------------------------------------------

  it('returns 400 when code exceeds 50 KB', async () => {
    const bigCode = 'class MyStrategy:\n    pass\n' + 'x = 1\n'.repeat(15_000)
    const { status, json } = await callPOST({ cohortId: 'c1', strategyName: 'Test', code: bigCode })
    expect(status).toBe(400)
    expect(json.error).toMatch(/KB limit/)
  })

  // ---- Deduplication ------------------------------------------------------

  it('returns 409 when identical code was submitted recently', async () => {
    mockDedupe.mockResolvedValue({ data: [{ id: 'sub-existing' }], error: null })
    const { status, json } = await callPOST({
      cohortId: 'c1', strategyName: 'Test', code: VALID_CODE,
    })
    expect(status).toBe(409)
    expect(json.error).toMatch(/Identical strategy/)
  })

  // ---- Database errors ----------------------------------------------------

  it('returns 500 when Supabase insert fails', async () => {
    mockInsert.mockResolvedValue({ data: null, error: { message: 'DB constraint violation' } })
    const { status, json } = await callPOST({
      cohortId: 'c1', strategyName: 'Test', code: VALID_CODE,
    })
    expect(status).toBe(500)
    expect(json.error).toMatch(/DB constraint violation/)
  })
})
