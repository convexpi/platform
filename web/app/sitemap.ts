import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { FACTORS } from '@/lib/research-data'
import { LECTURES } from '@/lib/lectures'

// ─────────────────────────────────────────────────────────────────────────────
// MAINTENANCE: keep this in sync with the routes under app/.
//   • Added a new PUBLIC page (a new app/<route>/page.tsx)?  Add it to STATIC below.
//   • New DB-backed content type with its own pages (like surveys/projects)?  Add a query block.
//   • Private/authed pages (admin, dashboard, settings, notifications, *_new, edit) stay OUT —
//     and should also be listed in app/robots.ts `disallow`.
// A quick check when routes change: `find app -name page.tsx` vs. the entries here.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://convexpi.ai'

type Freq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
const entry = (path: string, priority: number, changeFrequency: Freq, lastModified: Date) =>
  ({ url: `${BASE_URL}${path}`, lastModified, changeFrequency, priority })

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Public, indexable pages (path, priority, change frequency).
  const STATIC: [string, number, Freq][] = [
    ['', 1.0, 'weekly'],
    // Learn
    ['/overview', 0.9, 'weekly'],
    ['/getting-started', 0.8, 'monthly'],
    ['/curriculum', 0.9, 'weekly'],
    ['/lectures', 0.8, 'weekly'],
    ['/sdks', 0.7, 'monthly'],
    ['/teach', 0.7, 'monthly'],
    ['/exchange', 0.7, 'monthly'],
    ['/exchange/realistic', 0.6, 'monthly'],
    ['/lessons/market-making', 0.6, 'monthly'],
    ['/glossary', 0.5, 'monthly'],
    // Research
    ['/research', 0.9, 'monthly'],
    ['/surveys', 0.8, 'weekly'],
    ['/papers', 0.7, 'weekly'],
    ['/anomalies', 0.8, 'weekly'],
    ['/replications', 0.8, 'monthly'],
    // Practice
    ['/compete', 0.8, 'daily'],
    ['/agents', 0.7, 'daily'],
    ['/playground', 0.7, 'monthly'],
    // Community
    ['/projects', 0.7, 'daily'],
    ['/community', 0.8, 'daily'],
    ['/contributors', 0.6, 'weekly'],
    ['/about', 0.5, 'yearly'],
    // Auth
    ['/login', 0.3, 'yearly'],
    ['/signup', 0.4, 'yearly'],
  ]
  const staticRoutes = STATIC.map(([p, pri, f]) => entry(p, pri, f, now))

  // Lecture detail pages (static content).
  const lectureRoutes = LECTURES.map(l => entry(`/lectures/${l.slug}`, 0.7, 'monthly', now))

  // Research factor pages (statically known).
  const factorRoutes = FACTORS.map(f => entry(`/research/${f.slug}`, 0.8, 'monthly', now))

  // DB-backed public content.
  let cohortRoutes: MetadataRoute.Sitemap = []
  let profileRoutes: MetadataRoute.Sitemap = []
  let surveyRoutes: MetadataRoute.Sitemap = []
  let projectRoutes: MetadataRoute.Sitemap = []

  try {
    const supabase = await createClient()

    const { data: cohorts } = await supabase
      .from('cohorts').select('slug, created_at, type').eq('visibility', 'public')
    cohortRoutes = (cohorts ?? []).map(c => entry(
      `/${c.type === 'competition' ? 'compete' : 'classroom'}/${c.slug}`,
      0.6, 'daily', new Date(c.created_at ?? now)))

    const { data: profiles } = await supabase.from('profiles').select('username, created_at')
    profileRoutes = (profiles ?? []).map(p => entry(`/profile/${p.username}`, 0.5, 'weekly', new Date(p.created_at ?? now)))

    const { data: surveys } = await supabase
      .from('surveys').select('slug').eq('status', 'published')
    surveyRoutes = (surveys ?? []).map(s => entry(`/surveys/${s.slug}`, 0.6, 'monthly', now))

    const { data: projects } = await supabase
      .from('projects').select('slug, published_at').eq('status', 'published')
    projectRoutes = (projects ?? []).map(p => entry(`/projects/${p.slug}`, 0.5, 'weekly', new Date(p.published_at ?? now)))
  } catch {
    // DB unavailable at build time — static routes still served.
  }

  return [
    ...staticRoutes, ...lectureRoutes, ...factorRoutes,
    ...cohortRoutes, ...profileRoutes, ...surveyRoutes, ...projectRoutes,
  ]
}
