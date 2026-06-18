/**
 * Tests for the Nav component — desktop links and mobile hamburger drawer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}))
const mockSignOut = vi.fn(() => Promise.resolve({}))
const mockProfileSingle = vi.fn(() => Promise.resolve({ data: { username: 'tester' } }))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockProfileSingle,
        })),
      })),
    })),
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
  })),
}))

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}))

vi.mock('@/components/notification-bell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}))

// Import after mocks
import { Nav } from '@/components/nav'
import { usePathname } from 'next/navigation'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Nav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockProfileSingle.mockResolvedValue({ data: { username: 'tester' } })
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    ;(usePathname as ReturnType<typeof vi.fn>).mockReturnValue('/')
  })

  it('renders the brand name', () => {
    render(<Nav />)
    expect(screen.getAllByText(/ConvexPi/i).length).toBeGreaterThan(0)
  })

  it('renders Sign in and Get started when unauthenticated (desktop)', () => {
    render(<Nav />)
    expect(screen.getAllByText(/Sign in/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Get started/i).length).toBeGreaterThan(0)
  })

  it('renders the Compete link', () => {
    render(<Nav />)
    // Multiple instances (desktop + mobile drawer) — at least one
    expect(screen.getAllByRole('link', { name: /Compete/i }).length).toBeGreaterThan(0)
  })

  it('does not render Dashboard link when unauthenticated', () => {
    render(<Nav />)
    // Dashboard appears in both nav variants, so check auth state drives it
    expect(screen.queryByRole('link', { name: /^Dashboard$/i })).toBeNull()
  })

  it('renders the mobile hamburger button', () => {
    render(<Nav />)
    expect(screen.getByRole('button', { name: /Open menu/i })).toBeInTheDocument()
  })

  it('opens the mobile drawer when hamburger is clicked', () => {
    render(<Nav />)
    const hamburger = screen.getByRole('button', { name: /Open menu/i })
    fireEvent.click(hamburger)
    // SheetContent renders Sign in and Get started inside the drawer
    const signInButtons = screen.getAllByText(/Sign in/i)
    expect(signInButtons.length).toBeGreaterThan(1)   // desktop + drawer
  })

  it('shows Sign out when authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOnAuthStateChange.mockImplementation(((cb: any) => {
      cb('SIGNED_IN', { user: { id: 'u1' } })
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    }) as any)
    render(<Nav />)
    // Auth state updated via onAuthStateChange callback
    expect(screen.getAllByText(/Sign out/i).length).toBeGreaterThan(0)
  })

  it('highlights active nav link', () => {
    ;(usePathname as ReturnType<typeof vi.fn>).mockReturnValue('/compete')
    render(<Nav />)
    // The /compete link should have text-primary class applied
    const competeLinks = screen.getAllByRole('link', { name: /Compete/i })
    expect(competeLinks.some(l => l.className.includes('text-primary'))).toBe(true)
  })
})
