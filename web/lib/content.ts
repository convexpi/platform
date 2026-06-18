/**
 * content.ts — fetch wiki content from convexpi/content repo at build time.
 *
 * Prefers a local clone (CONTENT_REPO_PATH env) for local dev and CI builds
 * that clone the repo. Falls back to the GitHub raw content URL for Vercel
 * deployments that don't have a local clone.
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/convexpi/content/main'

// Set CONTENT_REPO_PATH to the local clone path to avoid GitHub API calls.
// e.g. CONTENT_REPO_PATH=/home/runner/work/content in GitHub Actions.
const LOCAL_PATH = process.env.CONTENT_REPO_PATH ?? ''

export interface WikiEntry {
  id: string
  title: string
  authors: { name: string }[] | string[]
  year: number | null
  journal: string | null
  doi: string | null
  arxiv_id: string | null
  topics: string[]
  is_oos_paper: boolean
  updated_at: string
}

export interface ContentIndex {
  updated_at: string
  count: number
  wikis: WikiEntry[]
}

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

let _indexCache: ContentIndex | null = null

export async function loadContentIndex(): Promise<ContentIndex> {
  if (_indexCache) return _indexCache

  const empty: ContentIndex = { updated_at: '', count: 0, wikis: [] }

  // Local clone path
  if (LOCAL_PATH) {
    const p = join(LOCAL_PATH, 'index.json')
    if (existsSync(p)) {
      try {
        _indexCache = JSON.parse(readFileSync(p, 'utf-8')) as ContentIndex
        return _indexCache
      } catch { /* fall through */ }
    }
  }

  // GitHub raw URL
  try {
    const resp = await fetch(`${GITHUB_RAW_BASE}/index.json`, {
      next: { revalidate: 3600 },  // cache for 1 hour
    })
    if (!resp.ok) return empty
    _indexCache = await resp.json() as ContentIndex
    return _indexCache
  } catch {
    return empty
  }
}

// ---------------------------------------------------------------------------
// Individual wiki
// ---------------------------------------------------------------------------

export async function loadWiki(paperId: string): Promise<string | null> {
  // Local clone path
  if (LOCAL_PATH) {
    const p = join(LOCAL_PATH, 'wikis', `${paperId}.md`)
    if (existsSync(p)) return readFileSync(p, 'utf-8')
  }

  // GitHub raw URL
  try {
    const resp = await fetch(
      `${GITHUB_RAW_BASE}/wikis/${paperId}.md`,
      { next: { revalidate: 3600 } },
    )
    if (!resp.ok) return null
    return resp.text()
  } catch {
    return null
  }
}
