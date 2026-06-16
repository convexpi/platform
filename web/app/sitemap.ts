import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { FACTORS } from '@/lib/research-data'

const BASE_URL = 'https://convexpi.ai'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/research`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/community`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/getting-started`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/signup`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
  ]

  // Research factor pages (statically known)
  const factorRoutes: MetadataRoute.Sitemap = FACTORS.map(f => ({
    url: `${BASE_URL}/research/${f.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  // Public competition pages
  let cohortRoutes: MetadataRoute.Sitemap = []
  let profileRoutes: MetadataRoute.Sitemap = []

  try {
    const supabase = await createClient()

    const { data: cohorts } = await supabase
      .from('cohorts')
      .select('slug, created_at, type')
      .eq('visibility', 'public')

    cohortRoutes = (cohorts ?? []).map(c => ({
      url: `${BASE_URL}/${c.type === 'competition' ? 'compete' : 'classroom'}/${c.slug}`,
      lastModified: new Date(c.created_at ?? now),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    }))

    const { data: profiles } = await supabase
      .from('profiles')
      .select('username, created_at')

    profileRoutes = (profiles ?? []).map(p => ({
      url: `${BASE_URL}/profile/${p.username}`,
      lastModified: new Date(p.created_at ?? now),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }))
  } catch {
    // DB unavailable at build time — static routes still served
  }

  return [...staticRoutes, ...factorRoutes, ...cohortRoutes, ...profileRoutes]
}
