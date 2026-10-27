import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ArenaBook } from '@/components/arena-book'

class MockWebSocket {
  static instances: MockWebSocket[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  send = vi.fn()
  close = vi.fn()

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }
}

describe('ArenaBook reconnects through a sleeping arena cold start', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('retries a closed first socket and becomes live on the next one', async () => {
    const view = render(<ArenaBook url="wss://arena.example.test" />)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(MockWebSocket.instances).toHaveLength(1)

    act(() => { MockWebSocket.instances[0].onclose?.() })
    expect(screen.getByText(/Arena waking/i)).toBeInTheDocument()

    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })
    expect(MockWebSocket.instances).toHaveLength(2)
    act(() => {
      MockWebSocket.instances[1].onopen?.()
      MockWebSocket.instances[1].onmessage?.({ data: JSON.stringify({ type: 'welcome' }) })
    })
    expect(screen.getByText('Live order book')).toBeInTheDocument()
    expect(MockWebSocket.instances[1].send).toHaveBeenCalledWith('{"type":"observe"}')
    view.unmount()
  })
})
