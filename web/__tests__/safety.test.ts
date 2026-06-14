import { describe, it, expect } from 'vitest'
import {
  findBlockedPattern,
  hasMyStrategy,
  validateSubmission,
  BLOCKED_PATTERNS,
} from '@/lib/safety'

// ---------------------------------------------------------------------------
// Minimal valid strategy — used as a safe baseline throughout
// ---------------------------------------------------------------------------

const VALID_CODE = `
import numpy as np
from convexpi.lab.backtest import Strategy

class MyStrategy(Strategy):
    def on_day(self, day, features, prices, portfolio):
        return np.zeros(len(prices))
`

// ---------------------------------------------------------------------------
// findBlockedPattern
// ---------------------------------------------------------------------------

describe('findBlockedPattern()', () => {
  it('returns null for clean code', () => {
    expect(findBlockedPattern(VALID_CODE)).toBeNull()
  })

  it('detects "import os"', () => {
    expect(findBlockedPattern('import os\nprint(os.getcwd())')).toBe('import os')
  })

  it('detects "import sys"', () => {
    expect(findBlockedPattern('import sys')).toBe('import sys')
  })

  it('detects "import subprocess"', () => {
    expect(findBlockedPattern('import subprocess')).toBe('import subprocess')
  })

  it('detects "import socket"', () => {
    expect(findBlockedPattern('import socket; socket.connect(("x", 80))')).toBe('import socket')
  })

  it('detects "import requests"', () => {
    expect(findBlockedPattern('import requests')).toBe('import requests')
  })

  it('detects "__import__"', () => {
    expect(findBlockedPattern('__import__("os")')).toBe('__import__')
  })

  it('detects "open("', () => {
    expect(findBlockedPattern('f = open("/etc/passwd")')).toBe('open(')
  })

  it('detects "eval("', () => {
    expect(findBlockedPattern('result = eval("1 + 2")')).toBe('eval(')
  })

  it('detects "exec("', () => {
    expect(findBlockedPattern('exec("x = 1")')).toBe('exec(')
  })

  it('returns the first match when multiple patterns present', () => {
    const code = 'import os\nimport sys'
    const match = findBlockedPattern(code)
    // The first encountered pattern (in BLOCKED_PATTERNS order) is returned
    expect(match).not.toBeNull()
    expect(BLOCKED_PATTERNS).toContain(match)
  })

  it('is case-sensitive (does not flag "Import os")', () => {
    // Python is case-sensitive; "Import os" is not valid Python anyway
    expect(findBlockedPattern('Import os')).toBeNull()
  })

  it('flags pattern embedded mid-line', () => {
    expect(findBlockedPattern('x = eval("1+1")')).toBe('eval(')
  })
})

// ---------------------------------------------------------------------------
// hasMyStrategy
// ---------------------------------------------------------------------------

describe('hasMyStrategy()', () => {
  it('returns true when class MyStrategy is present', () => {
    expect(hasMyStrategy(VALID_CODE)).toBe(true)
  })

  it('returns false when class is missing', () => {
    expect(hasMyStrategy('import numpy as np\n')).toBe(false)
  })

  it('returns false for a differently-named class', () => {
    expect(hasMyStrategy('class NotMyStrategy(Strategy): pass')).toBe(false)
  })

  it('returns true when MyStrategy appears anywhere in the code', () => {
    expect(hasMyStrategy('# MyStrategy\nclass MyStrategy: pass')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// validateSubmission
// ---------------------------------------------------------------------------

describe('validateSubmission()', () => {
  it('accepts valid code', () => {
    const result = validateSubmission(VALID_CODE)
    expect(result.ok).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('rejects blocked import — returns ok:false with error message', () => {
    const result = validateSubmission('import os\nclass MyStrategy: pass')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Blocked/)
    expect(result.error).toMatch(/"import os"/)
  })

  it('rejects missing MyStrategy class', () => {
    const result = validateSubmission('import numpy as np\ndef my_fn(): pass')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/MyStrategy/)
  })

  it('blocked pattern takes priority over missing class', () => {
    // Both violations present — blocked check runs first
    const result = validateSubmission('import os')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Blocked/)
  })

  it('error message names the specific blocked pattern', () => {
    const result = validateSubmission('exec("x")\nclass MyStrategy: pass')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('"exec("')
  })

  it('accepts code with convexpi imports', () => {
    const code = `
from convexpi.lab.backtest import Strategy, LongShortRank
import numpy as np

class MyStrategy(Strategy):
    def on_day(self, day, features, prices, portfolio):
        return LongShortRank("mom_1m").on_day(day, features, prices, portfolio)
`
    expect(validateSubmission(code).ok).toBe(true)
  })

  it('rejects empty string', () => {
    const result = validateSubmission('')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/MyStrategy/)
  })
})
