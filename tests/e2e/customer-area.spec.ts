import { expect, test, type Page } from '@playwright/test'

import { ACCOUNT_MESSAGES, confirmPath, seedArea, type SeededArea } from './support/account'
import { sleep } from '../../scripts/test-process'
import { createCustomer, readProfileState } from '../support/account'
import { assertTestStripeKey, cleanupE2eData } from '../support/db'
import { uniqueTestEmail } from '../support/env'
import { findLink, waitForOneMail } from '../support/outbox'

const FR = ACCOUNT_MESSAGES.fr

const openArea = async (page: Page, area: SeededArea): Promise<void> => {
  await page.goto(await confirmPath(area.customer.email, 'fr'))
  await page.waitForURL(url => url.pathname === '/account')
  await expect(page.getByRole('heading', { level: 1, name: 'Bonjour Ada' })).toBeVisible()
}

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
})

test.afterAll(async () => {
  const removed = await cleanupE2eData()
  console.warn(`cleanup: ${removed.bookings} bookings, ${removed.users} accounts`)
})

test.describe('magic link journey', () => {
  test('opens the area from the link, then refuses the same link a second time', async ({
    page,
    browser,
  }) => {
    const area = await seedArea('journey')
    const path = await confirmPath(area.customer.email, 'fr')
    await page.goto(path)

    await page.waitForURL(url => url.pathname === '/account')
    expect(page.url()).not.toContain('#')
    expect(page.url()).not.toContain('token_hash')
    const heading = page.getByRole('heading', { level: 1, name: 'Bonjour Ada' })
    await expect(heading).toBeVisible()
    await expect(heading).toBeFocused()

    const cards = page.getByRole('article')
    await expect(cards).toHaveCount(3)
    await expect(page.getByText(FR.booking.statuses.paid)).toBeVisible()
    await expect(page.getByText(FR.booking.statuses.completed)).toBeVisible()
    await expect(page.getByText(FR.booking.statuses.cancelled)).toBeVisible()

    const fresh = await browser.newContext({ locale: 'fr-FR' })
    const stranger = await fresh.newPage()
    const verification = stranger.waitForResponse(
      response => response.url().includes('/auth/v1/verify'),
      { timeout: 30_000 },
    )
    await stranger.goto(path)
    expect((await verification).ok()).toBe(false)
    const failed = stranger.getByRole('heading', { level: 1, name: FR.confirm.failedTitle })
    await expect(failed).toBeVisible()
    await expect(failed).toBeFocused()
    expect(stranger.url()).not.toContain('#')
    await stranger.getByRole('link', { name: FR.confirm.loginCta }).click()
    await stranger.waitForURL(url => url.pathname === '/login')
    await fresh.close()
  })

  test('keeps the intended cookie settings: 400 days, SameSite Lax', async ({ page }) => {
    const area = await seedArea('cookie')
    await openArea(page, area)
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find(cookie => cookie.name.startsWith('sb-'))
    expect(sessionCookie?.sameSite).toBe('Lax')
    const lifetime = (sessionCookie?.expires ?? 0) - Date.now() / 1000
    expect(lifetime).toBeGreaterThan(300 * 24 * 3600)
  })
})

test.describe('visitor without session', () => {
  test('redirects /account to /login', async ({ page }) => {
    await page.goto('/account')
    await page.waitForURL(url => url.pathname === '/login')
    await expect(page.getByRole('heading', { level: 1, name: FR.login.title })).toBeVisible()
  })

  test('sends a real link by mail that opens the area', async ({ page }) => {
    const customer = await createCustomer({
      email: uniqueTestEmail('mail'),
      firstName: 'Ada',
    })
    const since = new Date()
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel(FR.login.email).fill(customer.email.toUpperCase())
    await page.getByRole('button', { name: FR.login.submit }).click()
    await expect(page.getByRole('heading', { level: 2, name: FR.login.sent.title })).toBeVisible()

    const mail = await waitForOneMail({
      to: customer.email,
      subjectIncludes: 'Votre lien de connexion',
      since,
    })
    const href = findLink(mail.html, '/account/confirm#')
    expect(href).toBeDefined()
    expect(new URL(href ?? '').search).toBe('')

    await page.goto(href ?? '')
    await page.waitForURL(url => url.pathname === '/account')
    await expect(page.getByRole('heading', { level: 1, name: 'Bonjour Ada' })).toBeVisible()
    await expect(page.getByText(FR.dashboard.empty.title)).toBeVisible()
  })
})

test.describe('deletion request', () => {
  test('confirms, records the request and keeps it after a reload', async ({ page }) => {
    const area = await seedArea('deletion')
    await openArea(page, area)
    await page.getByRole('button', { name: FR.deletion.request }).click()
    const confirmTitle = page.getByRole('heading', { name: FR.deletion.confirmTitle })
    await expect(confirmTitle).toBeFocused()
    await page.getByRole('button', { name: FR.deletion.cancel }).click()
    await expect(page.getByRole('button', { name: FR.deletion.request })).toBeFocused()

    await page.getByRole('button', { name: FR.deletion.request }).click()
    await page.getByRole('button', { name: FR.deletion.confirm }).click()
    const done = page.getByText(FR.deletion.doneTitle)
    await expect(done).toBeVisible()
    await expect(done).toBeFocused()

    await expect
      .poll(async () => (await readProfileState(area.customer.id)).deletion_requested_at, {
        timeout: 20_000,
      })
      .not.toBeNull()
    await page.reload()
    await expect(page.getByText(FR.deletion.doneTitle)).toBeVisible()
    await expect(page.getByRole('button', { name: FR.deletion.request })).toHaveCount(0)
  })
})

test.describe('sign out', () => {
  test('announces the sign out, returns to /login and closes the area', async ({ page }) => {
    const area = await seedArea('signout')
    await openArea(page, area)
    await page.route('**/auth/v1/logout*', async route => {
      await sleep(1500)
      await route.continue()
    })
    await page.getByRole('button', { name: FR.dashboard.signOut }).click()
    await expect(page.getByRole('status').filter({ hasText: FR.dashboard.signingOut })).toHaveCount(
      1,
    )
    await page.waitForURL(url => url.pathname === '/login')
    await page.goto('/account')
    await page.waitForURL(url => url.pathname === '/login')
    const cookies = await page.context().cookies()
    expect(cookies.filter(cookie => cookie.name.startsWith('sb-') && cookie.value)).toHaveLength(0)
  })
})
