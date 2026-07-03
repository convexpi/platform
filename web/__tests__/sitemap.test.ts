/**
 * Guard: every PUBLIC page under app/ must appear in app/sitemap.ts, so the sitemap can't silently
 * fall behind new routes. When this fails, either add the route to STATIC in app/sitemap.ts, or — if
 * it should stay unindexed — add it to PRIVATE below (and to robots.ts `disallow`).
 * Dynamic routes ([slug]) are covered by the DB/static-data blocks in the sitemap, so they're skipped.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const APP = join(process.cwd(), 'app')

function pageRoutes(dir = APP, base = ''): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...pageRoutes(full, `${base}/${name}`))
    else if (name === 'page.tsx') out.push(base) // base is the route path ('' = home)
  }
  return out
}

// Private / authed / intentionally-unindexed routes (kept out of the sitemap; mirror robots.ts).
const PRIVATE = [
  '/admin', '/dashboard', '/settings', '/notifications',
  '/forgot-password', '/reset-password', '/profile/edit',
  '/compete/new', '/classroom/new', '/classroom/join', '/projects/new',
  '/tutor', '/seasons',
]
const isDynamic = (r: string) => r.includes('[') || r.includes('(')
const isPrivate = (r: string) => PRIVATE.some((p) => r === p || r.startsWith(p + '/'))

describe('sitemap covers every public page', () => {
  const src = readFileSync(join(APP, 'sitemap.ts'), 'utf8')
  const publicStatic = pageRoutes().filter((r) => !isDynamic(r) && !isPrivate(r))

  it.each(publicStatic)('%s is listed in app/sitemap.ts', (route) => {
    const token = route === '' ? "['', " : `'${route}'`
    expect(
      src.includes(token),
      `${route || '/'} has a page.tsx but is missing from app/sitemap.ts — add it to STATIC, ` +
        `or add it to PRIVATE in this test + robots.ts disallow if it should stay unindexed.`,
    ).toBe(true)
  })
})
