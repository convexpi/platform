import { describe, it, expect } from 'vitest'
import { auditStrategy } from '@/lib/auditor'

const BASE = `
from convexpi.lab import Strategy
import numpy as np

class MyStrategy(Strategy):
    def on_day(self, day, features, prices, portfolio):
        signal = features["mom_1m"]
        n = len(signal)
        weights = np.zeros(n)
        hi = np.nanpercentile(signal, 80)
        lo = np.nanpercentile(signal, 20)
        weights[signal >= hi] =  1.0
        weights[signal <= lo] = -1.0
        total = np.abs(weights).sum()
        return weights / total if total > 0 else weights
`

describe('auditStrategy', () => {
  it('passes a clean strategy', () => {
    const result = auditStrategy(BASE)
    expect(result.flags).toHaveLength(0)
    expect(result.hasErrors).toBe(false)
    expect(result.hasWarnings).toBe(false)
  })

  it('flags negative shift as error', () => {
    const code = BASE.replace('features["mom_1m"]', 'features["mom_1m"].shift(-1)')
    const result = auditStrategy(code)
    expect(result.hasErrors).toBe(true)
    expect(result.flags.some(f => f.code === 'LOOKAHEAD_SHIFT')).toBe(true)
  })

  it('flags negative diff as error', () => {
    const code = BASE + '\n        x = prices.diff(-1)\n'
    const result = auditStrategy(code)
    expect(result.flags.some(f => f.code === 'LOOKAHEAD_DIFF')).toBe(true)
  })

  it('flags future index access as error', () => {
    const code = BASE + '\n        future = prices[day+1]\n'
    const result = auditStrategy(code)
    expect(result.flags.some(f => f.code === 'LOOKAHEAD_INDEX')).toBe(true)
  })

  it('flags return np.zeros as warning', () => {
    const code = BASE.replace('return weights / total if total > 0 else weights', 'return np.zeros(n)')
    const result = auditStrategy(code)
    expect(result.flags.some(f => f.code === 'CONSTANT_SIGNAL')).toBe(true)
  })

  it('flags return np.ones as warning', () => {
    const code = BASE.replace('return weights / total if total > 0 else weights', 'return np.ones(n)')
    const result = auditStrategy(code)
    expect(result.flags.some(f => f.code === 'CONSTANT_SIGNAL')).toBe(true)
  })

  it('flags missing on_day and predict as error', () => {
    const code = `
import numpy as np
class MyStrategy:
    pass
`
    const result = auditStrategy(code)
    expect(result.flags.some(f => f.code === 'NO_ENTRY_POINT')).toBe(true)
    expect(result.hasErrors).toBe(true)
  })

  it('accepts predict method as valid entry point', () => {
    const code = `
import numpy as np
class MyStrategy:
    def predict(self, features):
        return features[:, 0]
`
    const result = auditStrategy(code)
    expect(result.flags.some(f => f.code === 'NO_ENTRY_POINT')).toBe(false)
  })

  it('flags hardcoded weight list as warning', () => {
    const code = BASE.replace('return weights / total if total > 0 else weights', 'return [0.1, 0.2, 0.3]')
    const result = auditStrategy(code)
    expect(result.flags.some(f => f.code === 'HARDCODED_WEIGHTS')).toBe(true)
  })

  it('flags np.random as info', () => {
    const code = BASE + '\n        r = np.random.randn(n)\n'
    const result = auditStrategy(code)
    expect(result.flags.some(f => f.code === 'RANDOM_SIGNAL')).toBe(true)
    expect(result.flags.find(f => f.code === 'RANDOM_SIGNAL')?.severity).toBe('info')
  })

  it('flags very short code as info', () => {
    const code = 'class MyStrategy:\n    def on_day(self, d, f, p, pf): pass\n'
    const result = auditStrategy(code)
    expect(result.flags.some(f => f.code === 'TOO_SHORT')).toBe(true)
  })

  it('flags fit inside predict as warning', () => {
    const code = `
import numpy as np
from sklearn.linear_model import LinearRegression

class MyStrategy:
    def on_day(self, day, features, prices, portfolio):
        model = LinearRegression()
        model.fit(features, prices)
        return model.predict(features)
`
    const result = auditStrategy(code)
    expect(result.flags.some(f => f.code === 'FIT_IN_PREDICT')).toBe(true)
  })

  it('can accumulate multiple flags', () => {
    const code = `
import numpy as np
class MyStrategy:
    def on_day(self, day, features, prices, portfolio):
        x = features.shift(-1)
        return np.ones(len(x))
`
    const result = auditStrategy(code)
    expect(result.flags.length).toBeGreaterThanOrEqual(2)
    expect(result.hasErrors).toBe(true)
    expect(result.hasWarnings).toBe(true)
  })
})
