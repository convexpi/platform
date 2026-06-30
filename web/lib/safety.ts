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

// First-line checks per language. The real isolation is the grader's sandbox; this catches the
// obvious mistakes (wrong entry point) and high-risk calls before a submission is even queued.
const BLOCKED_R = ['system(', 'system2(', 'shell(', 'download.file', 'Sys.setenv', 'install.packages', 'unlink(']
const BLOCKED_JULIA = ['run(', 'download(', 'Pkg.', 'ccall(', 'open(', 'rm(']

export function validateForLanguage(code: string, language: string): ValidationResult {
  if (language === 'r') {
    if (!/on_day\s*(<-|=)\s*function/.test(code)) {
      return { ok: false, error: 'Your R code must define on_day <- function(day, features, prices, portfolio).' }
    }
    const hit = BLOCKED_R.find(b => code.includes(b))
    return hit ? { ok: false, error: `Blocked R call: "${hit}".` } : { ok: true }
  }
  if (language === 'julia') {
    if (!/function\s+on_day\b/.test(code)) {
      return { ok: false, error: 'Your Julia code must define function on_day(day, features, prices, portfolio).' }
    }
    const hit = BLOCKED_JULIA.find(b => code.includes(b))
    return hit ? { ok: false, error: `Blocked Julia call: "${hit}".` } : { ok: true }
  }
  return validateSubmission(code)   // python (default)
}
