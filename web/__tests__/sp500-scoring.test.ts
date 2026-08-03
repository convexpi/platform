import { describe, expect, it } from 'vitest'
import {
  LIVE_MIN_DAYS, colorSlots, compareSp500, confidenceBand, liveQualified, liveSharpeStdError,
  type Sp500Score,
} from '@/lib/sp500-scoring'

const score = (o: Partial<Sp500Score> = {}): Sp500Score => ({
  sharpe: 0, hit_rate: 0.5, cum_return: 0,
  live_sharpe: 0, live_days: 0, live_hit_rate: 0, live_cum_return: 0, ...o,
})

describe('colorSlots', () => {
  it('assigns a stable slot per model regardless of the order given', () => {
    const ids = ['c', 'a', 'b']
    const ranked = colorSlots(ids)
    const reranked = colorSlots(['b', 'c', 'a'])
    for (const id of ids) expect(reranked.get(id)).toBe(ranked.get(id))
  })

  it('keeps a model on its colour when the standings reorder', () => {
    // The regression: slots came from the index into the *ranked* array, so a model changed colour
    // by moving one place — observed live, where a series went orange -> green on a rank change.
    const before = colorSlots(['deepseek', 'reversal', 'always-up'])
    const after = colorSlots(['always-up', 'deepseek', 'reversal'])
    expect(after.get('deepseek')).toBe(before.get('deepseek'))
  })

  it('gives every model a distinct slot', () => {
    const ids = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7']
    expect(new Set(colorSlots(ids).values()).size).toBe(ids.length)
  })
})

describe('confidenceBand', () => {
  it('stays quiet below the ranking threshold', () => {
    // Marking the Sharpe provisional and then printing a confident verdict from the same short
    // record contradicts itself.
    const band = confidenceBand(0.48, 22)
    expect(band.label).toBe('too early')
    expect(band.tone).toBe('muted')
    expect(band.hint).toContain(String(LIVE_MIN_DAYS))
  })

  it('reports a verdict once the record is long enough', () => {
    expect(confidenceBand(0.99, LIVE_MIN_DAYS).label).toBe('Strong')
    expect(confidenceBand(0.8, LIVE_MIN_DAYS).label).toBe('Promising')
    expect(confidenceBand(0.6, LIVE_MIN_DAYS).label).toBe('Coin flip')
    expect(confidenceBand(0.2, LIVE_MIN_DAYS).label).toBe('Likely luck')
  })

  it('handles a missing deflated Sharpe without claiming anything', () => {
    expect(confidenceBand(null, LIVE_MIN_DAYS).label).toBe('—')
  })
})

describe('liveQualified / ranking', () => {
  it('does not rank a short live record on its Sharpe', () => {
    expect(liveQualified(score({ live_sharpe: 5, live_days: 22 }))).toBe(false)
    expect(liveQualified(score({ live_sharpe: 5, live_days: LIVE_MIN_DAYS }))).toBe(true)
  })

  it('puts a long forward record ahead of a lucky short one', () => {
    const lucky = { s: score({ live_sharpe: 9, live_days: 3, sharpe: 0.1 }) }
    const proven = { s: score({ live_sharpe: 1, live_days: LIVE_MIN_DAYS, sharpe: 0.1 }) }
    expect([lucky, proven].sort(compareSp500)[0]).toBe(proven)
  })

  it('orders unqualified models by backtest Sharpe', () => {
    const weak = { s: score({ live_sharpe: 8, live_days: 5, sharpe: -0.5 }) }
    const strong = { s: score({ live_sharpe: -8, live_days: 5, sharpe: 1.3 }) }
    expect([weak, strong].sort(compareSp500)[0]).toBe(strong)
  })
})

describe('liveSharpeStdError', () => {
  it('shrinks as the record lengthens', () => {
    expect(liveSharpeStdError(22)!).toBeGreaterThan(liveSharpeStdError(252)!)
    expect(liveSharpeStdError(252)!).toBeCloseTo(1, 5)
  })

  it('is undefined without a record', () => {
    expect(liveSharpeStdError(0)).toBeNull()
  })
})
