/**
 * Submission safety validation — pure functions, no I/O, easily testable.
 *
 * These run before student code ever reaches the grader worker.
 * A blocked pattern here is a hard reject; the grader adds a second
 * sandbox layer for anything that slips through.
 */

export const BLOCKED_PATTERNS = [
  'import os',
  'import sys',
  'import subprocess',
  'import socket',
  'import requests',
  '__import__',
  'open(',
  'eval(',
  'exec(',
] as const

export interface ValidationResult {
  ok: boolean
  error?: string
}

/** Returns the first blocked pattern found, or null if clean. */
export function findBlockedPattern(code: string): string | null {
  for (const pattern of BLOCKED_PATTERNS) {
    if (code.includes(pattern)) return pattern
  }
  return null
}

/** Code must define `class MyStrategy`. */
export function hasMyStrategy(code: string): boolean {
  return code.includes('class MyStrategy')
}

/** Full gate: check both blocked patterns and required class. */
export function validateSubmission(code: string): ValidationResult {
  const blocked = findBlockedPattern(code)
  if (blocked) {
    return {
      ok: false,
      error: `Blocked import or call: "${blocked}". Only numpy and convexpi.lab are allowed.`,
    }
  }
  if (!hasMyStrategy(code)) {
    return { ok: false, error: 'Your code must define a class named MyStrategy.' }
  }
  return { ok: true }
}
