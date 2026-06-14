/**
 * Smoke tests — cover the critical user journey end-to-end.
 *
 * These tests require a running Next.js server (started automatically locally
 * via playwright.config.ts webServer; in CI the server must be started separately
 * with a real Supabase project or a local Supabase stack).
 *
 * Skipped tests are marked with test.skip() and document what's needed before
 * they can run (e.g., a seeded test account).
 */

import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Public pages (no auth required)
// ---------------------------------------------------------------------------

test('landing page renders ConvexPi brand', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/ConvexPi/i)
  await expect(page.getByText(/ConvexPi/i).first()).toBeVisible()
})

test('landing page has a call-to-action link', async ({ page }) => {
  await page.goto('/')
  // Either "Get started" or "Sign in" visible to unauthenticated visitors
  const cta = page.getByRole('link', { name: /get started|sign in/i }).first()
  await expect(cta).toBeVisible()
})

test('nav contains Compete link', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /Compete/i }).first()).toBeVisible()
})

test('/compete page renders leaderboard or redirect', async ({ page }) => {
  await page.goto('/compete')
  // Either shows leaderboard content or redirects to login — both acceptable
  const isLogin = page.url().includes('/login')
  const hasContent = await page.getByText(/leaderboard|compete|rank/i).first().isVisible().catch(() => false)
  expect(isLogin || hasContent).toBe(true)
})

test('login page renders email field', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel(/email/i).first()).toBeVisible()
})

test('/getting-started page renders step headings', async ({ page }) => {
  await page.goto('/getting-started')
  await expect(page.getByText(/get started in 30 minutes/i)).toBeVisible()
  await expect(page.getByText(/run mission 1/i)).toBeVisible()
  await expect(page.getByText(/see your score/i)).toBeVisible()
})

test('/getting-started Colab link points to mission notebook', async ({ page }) => {
  await page.goto('/getting-started')
  const colabLink = page.getByRole('link', { name: /open mission 1 in colab/i })
  await expect(colabLink).toBeVisible()
  const href = await colabLink.getAttribute('href')
  expect(href).toContain('colab.research.google.com')
  expect(href).toContain('mission_01')
})

// ---------------------------------------------------------------------------
// Mobile nav (responsive layout)
// ---------------------------------------------------------------------------

test('mobile: hamburger menu button is visible', async ({ page }) => {
  // Force a small viewport
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const hamburger = page.getByRole('button', { name: /open menu/i })
  await expect(hamburger).toBeVisible()
})

test('mobile: drawer opens when hamburger clicked', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: /open menu/i }).click()
  // Drawer should contain the Compete link
  await expect(page.getByRole('link', { name: /Compete/i }).first()).toBeVisible()
})

// ---------------------------------------------------------------------------
// Authenticated flow (requires TEST_USER_EMAIL / TEST_USER_PASSWORD env vars)
// ---------------------------------------------------------------------------

const TEST_EMAIL    = process.env.TEST_USER_EMAIL    ?? ''
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? ''
const HAS_TEST_CREDS = Boolean(TEST_EMAIL && TEST_PASSWORD)

test.describe('authenticated user journey', () => {
  test.skip(!HAS_TEST_CREDS, 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run auth tests')

  test('can log in', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).first().fill(TEST_EMAIL)
    await page.getByLabel(/password/i).first().fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    // Should land on dashboard or homepage after successful login
    await page.waitForURL(/dashboard|\/$/, { timeout: 10_000 })
    await expect(page.getByText(/sign out/i).first()).toBeVisible()
  })

  test('can navigate to submission editor', async ({ page }) => {
    // Assumes already logged in (storage state would be shared if configured)
    await page.goto('/compete')
    const editor = page.locator('.monaco-editor, [data-testid="code-editor"]').first()
    await expect(editor).toBeVisible({ timeout: 10_000 })
  })

  test('submit button is present on compete page', async ({ page }) => {
    await page.goto('/compete')
    const submitBtn = page.getByRole('button', { name: /submit/i })
    await expect(submitBtn).toBeVisible({ timeout: 10_000 })
  })

  test('leaderboard table renders after submission', async ({ page }) => {
    await page.goto('/compete')
    // Leaderboard should render immediately (even if empty)
    await expect(page.getByRole('table').first()).toBeVisible({ timeout: 10_000 })
  })
})

// ---------------------------------------------------------------------------
// API health checks
// ---------------------------------------------------------------------------

test('health endpoint is not reachable via the web port (expected)', async ({ request }) => {
  // The Arena health endpoint runs on a different port — this test just verifies
  // the web app's /api routes respond correctly
  const res = await request.get('/api/submissions', { failOnStatusCode: false })
  // Should be 401 (not a 500 or connection error)
  expect(res.status()).toBe(401)
})
