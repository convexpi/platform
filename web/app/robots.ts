import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin', '/dashboard', '/settings', '/notifications', '/profile/edit', '/compete/new', '/classroom/new'],
    },
    sitemap: 'https://convexpi.ai/sitemap.xml',
  }
}
