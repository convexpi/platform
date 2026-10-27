import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockList = vi.fn()
const mockDetail = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn(() => chain)
      chain.eq = vi.fn(() => chain)
      chain.order = mockList
      chain.maybeSingle = mockDetail
      return chain
    }),
  })),
}))

import { GET as listCompetitions } from '@/app/api/competitions/route'
import { GET as competitionDetail } from '@/app/api/competitions/[slug]/route'

const ARENA = {
  slug: 'arena-l3',
  name: 'Realistic Arena',
  description: 'Trade the queue.',
  status: 'active',
  arena_config: { ws_url: 'wss://arena.example.test' },
  market_config: {},
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('competition discovery API', () => {
  it('advertises the real Arena endpoint in the list and full example', async () => {
    mockList.mockResolvedValue({ data: [ARENA], error: null })
    const listResponse = await listCompetitions()
    const list = await listResponse.json()
    expect(list.competitions[0].connect_url).toBe('wss://arena.example.test')

    mockDetail.mockResolvedValue({ data: ARENA, error: null })
    const detailResponse = await competitionDetail(
      new Request('http://localhost/api/competitions/arena-l3'),
      { params: Promise.resolve({ slug: 'arena-l3' }) },
    )
    const detail = await detailResponse.json()
    expect(detail.how_to_submit.endpoint).toBe('wss://arena.example.test')
    expect(detail.how_to_submit.available).toBe(true)
    expect(detail.what_you_submit.example).toContain('wss://arena.example.test')
    expect(detail.what_you_submit.example).toContain('.start()')
    expect(detail.what_you_submit.example).not.toContain('wss://…')
  })

  it('returns 503 rather than a misleading empty catalog on a database failure', async () => {
    mockList.mockResolvedValue({ data: null, error: { message: 'offline' } })
    const response = await listCompetitions()
    expect(response.status).toBe(503)
    expect(response.headers.get('Retry-After')).toBe('30')
  })

  it('distinguishes a database failure from an unknown competition', async () => {
    mockDetail.mockResolvedValue({ data: null, error: { message: 'offline' } })
    const failed = await competitionDetail(new Request('http://localhost'), {
      params: Promise.resolve({ slug: 'missing' }),
    })
    expect(failed.status).toBe(503)

    mockDetail.mockResolvedValue({ data: null, error: null })
    const missing = await competitionDetail(new Request('http://localhost'), {
      params: Promise.resolve({ slug: 'missing' }),
    })
    expect(missing.status).toBe(404)
  })

  it('describes the Lab panel honestly as separate from hidden grading data', async () => {
    mockDetail.mockResolvedValue({
      data: { ...ARENA, slug: 'lab-open', arena_config: {}, market_config: {} },
      error: null,
    })
    const response = await competitionDetail(new Request('http://localhost'), {
      params: Promise.resolve({ slug: 'lab-open' }),
    })
    const detail = await response.json()
    expect(detail.data.access.load).toContain('representative deterministic training panel')
    expect(detail.data.access.load).toContain('separate hidden panel')
    expect(detail.data.access.load).not.toContain('same panel the grader uses')
  })
})
