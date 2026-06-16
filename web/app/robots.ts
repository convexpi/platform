import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard', '/profile/edit', '/compete/new'],
    },
    sitemap: 'https://convexpi.ai/sitemap.xml',
  }
}
