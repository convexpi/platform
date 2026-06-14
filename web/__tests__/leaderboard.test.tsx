/**
 * Tests for the Leaderboard component.
 *
 * Supabase realtime is mocked so we can test rendering and state changes
 * without a live connection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ArenaRanking } from '@/lib/types'

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------

const mockSubscribe = vi.fn((cb: (status: string) => void) => {
  cb('SUBSCRIBED')
  return { unsubscribe: vi.fn() }
})
const mockOn = vi.fn(() => ({ subscribe: mockSubscribe }))
const mockChannel = vi.fn(() => ({ on: mockOn }))
const mockRemoveChannel = vi.fn()
const mockFrom = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      order: vi.fn(() => Promise.resolve({ data: [] })),
    })),
  })),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
    from: mockFrom,
  })),
}))

// Import after mocks
import { Leaderboard } from '@/components/leaderboard'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRanking(overrides: Partial<ArenaRanking> = {}): ArenaRanking {
  return {
    session_id: 'sess-1',
    agent_id: 'agent-abc',
    user_id: 'user-1',
    tick: 100,
    pnl_dollars: 42.50,
    position: 5,
    survival_score: 1.23,
    eliminated: false,
    updated_at: new Date().toISOString(),
    username: 'alice',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-wire mock chain after clearAllMocks
    mockSubscribe.mockImplementation((cb: (status: string) => void) => {
      cb('SUBSCRIBED')
      return { unsubscribe: vi.fn() }
    })
    mockOn.mockReturnValue({ subscribe: mockSubscribe })
    mockChannel.mockReturnValue({ on: mockOn })
  })

  it('renders without crashing with empty rankings', () => {
    render(<Leaderboard sessionId="sess-1" initialRankings={[]} />)
    expect(screen.getByText(/Waiting for agents/i)).toBeInTheDocument()
  })

  it('renders agent username', () => {
    render(<Leaderboard sessionId="sess-1" initialRankings={[makeRanking()]} />)
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('falls back to agent_id when username is absent', () => {
    render(<Leaderboard sessionId="sess-1" initialRankings={[makeRanking({ username: undefined })]} />)
    expect(screen.getByText('agent-abc')).toBeInTheDocument()
  })

  it('shows university when present', () => {
    render(<Leaderboard sessionId="sess-1" initialRankings={[makeRanking({ university: 'MIT' })]} />)
    expect(screen.getByText('MIT')).toBeInTheDocument()
  })

  it('formats positive PnL with a plus sign', () => {
    render(<Leaderboard sessionId="sess-1" initialRankings={[makeRanking({ pnl_dollars: 42.50 })]} />)
    expect(screen.getByText('+$42.50')).toBeInTheDocument()
  })

  it('formats negative PnL with a minus sign', () => {
    render(<Leaderboard sessionId="sess-1" initialRankings={[makeRanking({ pnl_dollars: -15.75 })]} />)
    expect(screen.getByText('-$15.75')).toBeInTheDocument()
  })

  it('shows "Active" badge for non-eliminated agents', () => {
    render(<Leaderboard sessionId="sess-1" initialRankings={[makeRanking({ eliminated: false })]} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows "Eliminated" badge for eliminated agents', () => {
    render(<Leaderboard sessionId="sess-1" initialRankings={[makeRanking({ eliminated: true })]} />)
    expect(screen.getByText('Eliminated')).toBeInTheDocument()
  })

  it('renders rank numbers starting at 1', () => {
    const rankings = [makeRanking({ agent_id: 'a', username: 'alice' }), makeRanking({ agent_id: 'b', username: 'bob' })]
    render(<Leaderboard sessionId="sess-1" initialRankings={rankings} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows tick number', () => {
    render(<Leaderboard sessionId="sess-1" initialRankings={[makeRanking({ tick: 1234 })]} />)
    expect(screen.getByText(/Tick/i)).toBeInTheDocument()
  })

  it('displays survival score when present', () => {
    render(<Leaderboard sessionId="sess-1" initialRankings={[makeRanking({ survival_score: 2.34 })]} />)
    expect(screen.getByText('2.34')).toBeInTheDocument()
  })

  it('shows em-dash when survival score is null', () => {
    render(<Leaderboard sessionId="sess-1" initialRankings={[makeRanking({ survival_score: null })]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('subscribes to the correct session channel', () => {
    render(<Leaderboard sessionId="my-session" initialRankings={[]} />)
    expect(mockChannel).toHaveBeenCalledWith('arena_rankings:my-session')
  })
})
