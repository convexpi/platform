import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Capture 100% of traces in dev, 10% in production — tune as needed
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Only initialize when DSN is present (safe to omit in local dev)
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
