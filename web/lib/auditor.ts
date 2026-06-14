/**
 * Strategy auditor — static analysis of student code.
 *
 * Pure functions, no I/O. Runs in the browser as the user types and
 * server-side before the submission is inserted. Returns non-blocking
 * warnings alongside hard errors. The grader is still the authoritative
 * judge; this catches obvious mistakes early.
 */

export type AuditSeverity = 'error' | 'warning' | 'info'

export interface AuditFlag {
  severity: AuditSeverity
  code: string
  message: string
  detail: string
}

export interface AuditResult {
  flags: AuditFlag[]
  hasErrors: boolean
  hasWarnings: boolean
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

type Check = (code: string) => AuditFlag | null

/** Look-ahead via negative shift: features.shift(-1) or pd.shift(-N) */
const checkNegativeShift: Check = code => {
  if (/\.shift\s*\(\s*-/.test(code)) {
    return {
      severity: 'error',
      code: 'LOOKAHEAD_SHIFT',
      message: 'Look-ahead bias: negative shift',
      detail:
        '.shift(-N) accesses future values. Use .shift(1) or positive lags only. ' +
        'This will produce artificially high IS Sharpe that collapses on OOS data.',
    }
  }
  return null
}

/** Look-ahead via negative diff: .diff(-1) */
const checkNegativeDiff: Check = code => {
  if (/\.diff\s*\(\s*-/.test(code)) {
    return {
      severity: 'error',
      code: 'LOOKAHEAD_DIFF',
      message: 'Look-ahead bias: negative diff',
      detail:
        '.diff(-N) computes backward differences using future values. ' +
        'Use .diff(1) for past-to-present changes.',
    }
  }
  return null
}

/** Look-ahead via future index: prices[day+1], features[i+1], arr[t+1] */
const checkFutureIndex: Check = code => {
  if (/\[\s*(?:day|i|t|idx|index)\s*\+\s*\d+\s*\]/.test(code)) {
    return {
      severity: 'error',
      code: 'LOOKAHEAD_INDEX',
      message: 'Look-ahead bias: future index access',
      detail:
        'Accessing array[day+N] reads data that would not be available at prediction time. ' +
        'Only use indices ≤ the current day.',
    }
  }
  return null
}

/** Constant signal: np.zeros or np.ones returned as weights */
const checkConstantReturn: Check = code => {
  if (/return\s+np\.(?:zeros|ones)\b/.test(code)) {
    return {
      severity: 'warning',
      code: 'CONSTANT_SIGNAL',
      message: 'Constant signal detected',
      detail:
        'Returning np.zeros or np.ones means every stock gets the same weight every day. ' +
        'The strategy will have zero turnover and likely zero alpha. ' +
        'Return a cross-sectional ranking derived from features.',
    }
  }
  return null
}

/** No on_day / predict method — strategy won't be callable */
const checkMissingMethod: Check = code => {
  const hasOnDay  = /def\s+on_day\s*\(/.test(code)
  const hasPredict = /def\s+predict\s*\(/.test(code)
  if (!hasOnDay && !hasPredict) {
    return {
      severity: 'error',
      code: 'NO_ENTRY_POINT',
      message: 'No on_day or predict method found',
      detail:
        'MyStrategy must implement on_day(self, day, features, prices, portfolio) ' +
        'or predict(self, features). Without it the grader cannot call your strategy.',
    }
  }
  return null
}

/** Fitting on all data at once inside predict/on_day suggests full-history look-ahead */
const checkFullHistoryFit: Check = code => {
  // Warn if sklearn or statsmodels fit is called inside the prediction method
  if (/\.fit\s*\(/.test(code) && /def\s+(?:on_day|predict)/.test(code)) {
    return {
      severity: 'warning',
      code: 'FIT_IN_PREDICT',
      message: 'Model fitting inside prediction method',
      detail:
        'Calling .fit() inside on_day or predict re-trains on the full available history ' +
        'each day. This is valid only if you carefully slice to past data (e.g. features[:day]). ' +
        'Fitting on features without slicing is look-ahead bias.',
    }
  }
  return null
}

/** Suspiciously short strategy — probably placeholder */
const checkTooShort: Check = code => {
  const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
  if (lines.length < 5) {
    return {
      severity: 'info',
      code: 'TOO_SHORT',
      message: 'Strategy is very short',
      detail:
        'This looks like a placeholder. A working strategy typically needs at least ' +
        'a few lines to compute a cross-sectional signal and return weights.',
    }
  }
  return null
}

/** Hardcoded return of a Python list literal instead of an array */
const checkHardcodedWeights: Check = code => {
  // Matches: return [0.1, 0.2, ...] with at least one number inside
  if (/return\s*\[\s*[-\d.]+\s*,/.test(code)) {
    return {
      severity: 'warning',
      code: 'HARDCODED_WEIGHTS',
      message: 'Hardcoded weight list',
      detail:
        'Returning a fixed list of numbers ignores features entirely and will ' +
        'break when the number of stocks changes. Derive weights from features.',
    }
  }
  return null
}

/** Using random weights — technically valid but a red flag in this context */
const checkRandomWeights: Check = code => {
  if (/np\.random\./.test(code)) {
    return {
      severity: 'info',
      code: 'RANDOM_SIGNAL',
      message: 'Random signal detected',
      detail:
        'np.random produces random weights each day. This is useful as a baseline ' +
        "but won't discover real alpha. Did you mean to use actual features?",
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const CHECKS: Check[] = [
  checkNegativeShift,
  checkNegativeDiff,
  checkFutureIndex,
  checkConstantReturn,
  checkMissingMethod,
  checkFullHistoryFit,
  checkHardcodedWeights,
  checkTooShort,
  checkRandomWeights,
]

export function auditStrategy(code: string): AuditResult {
  const flags: AuditFlag[] = []

  for (const check of CHECKS) {
    const flag = check(code)
    if (flag) flags.push(flag)
  }

  return {
    flags,
    hasErrors:   flags.some(f => f.severity === 'error'),
    hasWarnings: flags.some(f => f.severity === 'warning'),
  }
}
