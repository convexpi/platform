/**
 * Tests for GET /api/grade-reports/[id]
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()
const mockGradeReportQuery = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockGradeReportQuery,
        })),
      })),
    })),
  })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: vi.fn(() => []) })),
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { GET } from '../app/api/grade-reports/[id]/route'

const makeParams = (id: string) => Promise.resolve({ id })

function makeRequest() {
  return new Request('http://localhost/api/grade-reports/test-id')
}

const REPORT_ROW = {
  id: 'report-1',
  submission_id: 'sub-1',
  is_sharpe: 0.8,
  oos_sharpe: 0.45,
  overfitting_ratio: 0.56,
  oos_max_dd: -12.3,
  oos_turnover: 5.2,
  alphas_discovered: 2,
  total_alphas: 3,
  graded_at: '2026-06-01T00:00:00Z',
  submissions: {
    user_id: 'user-abc',
    cohort_id: 'cohort-1',
    strategy_name: 'My Momentum Strategy',
    cohorts: { visibility: 'private' },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/grade-reports/[id]', () => {
  it('returns 404 when grade report does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockGradeReportQuery.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const res = await GET(makeRequest(), { params: makeParams('missing-id') })
    expect(res.status).toBe(404)
  })

  it('returns 403 for unauthenticated access to private cohort report', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockGradeReportQuery.mockResolvedValue({ data: REPORT_ROW, error: null })

    const res = await GET(makeRequest(), { params: makeParams('report-1') })
    expect(res.status).toBe(403)
  })

  it('returns 403 when authenticated user does not own the submission', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'other-user' } } })
    mockGradeReportQuery.mockResolvedValue({ data: REPORT_ROW, error: null })

    const res = await GET(makeRequest(), { params: makeParams('report-1') })
    expect(res.status).toBe(403)
  })

  it('returns JSON with Content-Disposition for the owning user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-abc' } } })
    mockGradeReportQuery.mockResolvedValue({ data: REPORT_ROW, error: null })

    const res = await GET(makeRequest(), { params: makeParams('report-1') })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/json')
    expect(res.headers.get('Content-Disposition')).toContain('attachment')
    expect(res.headers.get('Content-Disposition')).toContain('grade_report_')
  })

  it('strips nested submissions join from returned JSON', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-abc' } } })
    mockGradeReportQuery.mockResolvedValue({ data: REPORT_ROW, error: null })

    const res = await GET(makeRequest(), { params: makeParams('report-1') })
    const body = await res.json()
    expect(body).not.toHaveProperty('submissions')
    expect(body).toHaveProperty('oos_sharpe', 0.45)
  })

  it('returns 200 for any user when cohort is public', async () => {
    const publicReport = {
      ...REPORT_ROW,
      submissions: {
        ...REPORT_ROW.submissions,
        user_id: 'someone-else',
        cohorts: { visibility: 'public' },
      },
    }
    mockGetUser.mockResolvedValue({ data: { user: { id: 'random-visitor' } } })
    mockGradeReportQuery.mockResolvedValue({ data: publicReport, error: null })

    const res = await GET(makeRequest(), { params: makeParams('report-1') })
    expect(res.status).toBe(200)
  })

  it('returns 200 for anonymous visitors when cohort is public', async () => {
    const publicReport = {
      ...REPORT_ROW,
      submissions: {
        ...REPORT_ROW.submissions,
        cohorts: { visibility: 'public' },
      },
    }
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockGradeReportQuery.mockResolvedValue({ data: publicReport, error: null })

    const res = await GET(makeRequest(), { params: makeParams('report-1') })
    expect(res.status).toBe(200)
  })
})
