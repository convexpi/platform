import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({ getAll: () => [], set: vi.fn() })
  ),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCountQuery(count: number) {
  return { count, error: null }
}

function makeMembershipQuery(rows: { role: string }[]) {
  return { data: rows, error: null }
}

// Import after mocks
import { GET } from '@/app/api/admin/queue/route'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/admin/queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/unauthorized/i)
  })

  it('returns 403 when user has no admin/owner role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    // membership query returns empty
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ in: () => ({ limit: () => makeMembershipQuery([]) }) }) }),
    })

    const res = await GET()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/forbidden/i)
  })

  it('returns queue counts for an admin user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-admin' } } })

    let callIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'cohort_members') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                limit: () => makeMembershipQuery([{ role: 'admin' }]),
              }),
            }),
          }),
        }
      }
      // submissions table — return different counts per call
      const counts = [3, 1, 20, 2]
      const count = counts[callIndex++ % counts.length]
      return {
        select: () => ({
          eq: () => ({
            count,
            error: null,
            // for .gte() chaining (completed_today / failed_today)
            gte: () => ({ count, error: null }),
          }),
          head: true,
        }),
      }
    })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('pending')
    expect(body).toHaveProperty('running')
    expect(body).toHaveProperty('completed_today')
    expect(body).toHaveProperty('failed_today')
    expect(body).toHaveProperty('checked_at')
    expect(typeof body.checked_at).toBe('string')
  })

  it('includes checked_at as a valid ISO timestamp', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-admin' } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'cohort_members') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                limit: () => makeMembershipQuery([{ role: 'owner' }]),
              }),
            }),
          }),
        }
      }
      return {
        select: () => ({
          eq: () => ({ count: 0, error: null, gte: () => ({ count: 0, error: null }) }),
        }),
      }
    })

    const res = await GET()
    const body = await res.json()
    const ts = Date.parse(body.checked_at)
    expect(Number.isNaN(ts)).toBe(false)
  })
})
