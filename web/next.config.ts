import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Provide build-time fallbacks so `npm run build` works without a real Supabase project.
  // Vercel/Railway will override these with actual values at runtime.
  env: {
    NEXT_PUBLIC_SUPABASE_URL:      process.env.NEXT_PUBLIC_SUPABASE_URL      ?? "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
  },
};

// Wrap with Sentry only when the package is available (optional dependency)
async function buildConfig() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    try {
      const { withSentryConfig } = await import("@sentry/nextjs");
      return withSentryConfig(nextConfig, {
        silent: true,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
        disableLogger: true,
      });
    } catch {
      // @sentry/nextjs not installed — skip
    }
  }
  return nextConfig;
}

export default buildConfig();
