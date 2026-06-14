import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Provide build-time fallbacks so `npm run build` works without a real Supabase project.
  // Vercel/Railway will override these with actual values at runtime.
  env: {
    NEXT_PUBLIC_SUPABASE_URL:      process.env.NEXT_PUBLIC_SUPABASE_URL      ?? "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
  },
};

export default withSentryConfig(nextConfig, {
  // Source maps uploaded on production builds only (requires SENTRY_AUTH_TOKEN env var)
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Disable source map upload when auth token is absent (local dev, CI without secrets)
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  // Avoid instrumenting development builds
  disableLogger: true,
});
