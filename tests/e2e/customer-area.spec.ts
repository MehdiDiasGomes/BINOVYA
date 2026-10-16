import { expect, test, type Locator, type Page } from '@playwright/test'

import { ACCOUNT_MESSAGES, confirmPath, seedArea, type SeededArea } from './support/account'
import {
  createCustomer,
  openPasswordSession,
  readProfileState,
  sessionCookieName,
  sessionCookieValue,
} from '../support/account'
import { assertTestStripeKey, cleanupE2eData, sleep } from '../support/db'
import { readEnv, uniqueTestEmail } from '../support/env'
import { findLink, waitForOneMail } from '../support/outbox'

const naturalWidthOf = (image: Element): number => (image as HTMLImageElement).naturalWidth

const FR = ACCOUNT_MESSAGES.fr
const EN = ACCOUNT_MESSAGES.en

const expectDecoded = (photo: Locator): Promise<void> =>
  expect.poll(() => photo.evaluate(naturalWidthOf)).toBeGreaterThan(0)

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

    const photos = page.getByRole('img', { name: /Vos bacs (avant|après) le nettoyage/ })
    await expect(photos).toHaveCount(2)
    await Promise.all((await photos.all()).map(expectDecoded))

    const fresh = await browser.newContext({ locale: 'fr-FR' })
    const stranger = await fresh.newPage()
    await stranger.goto(path)
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

  test('still accepts an old link that carries type=magiclink in its fragment', async ({
    page,
  }) => {
    const area = await seedArea('legacy')
    await page.goto(await confirmPath(area.customer.email, 'fr', { legacyType: true }))
    await page.waitForURL(url => url.pathname === '/account')
    expect(page.url()).not.toContain('#')
    await expect(page.getByRole('heading', { level: 1, name: 'Bonjour Ada' })).toBeVisible()
  })

  test('opens the English area from an /en link', async ({ page }) => {
    const area = await seedArea('journey-en')
    await page.goto(await confirmPath(area.customer.email, 'en'))
    await page.waitForURL(url => url.pathname === '/en/account')
    expect(page.url()).not.toContain('#')
    await expect(page.getByRole('heading', { level: 1, name: 'Hello Ada' })).toBeVisible()
    await expect(page.getByText(EN.booking.statuses.completed)).toBeVisible()
    await expect(page.getByRole('button', { name: /Enlarge the « Before » photo/ })).toBeVisible()
  })

  test('shows the English error card with a link to /en/login for a dead link', async ({
    page,
  }) => {
    await page.goto('/en/account/confirm#token_hash=deadbeef&type=magiclink')
    const failed = page.getByRole('heading', { level: 1, name: EN.confirm.failedTitle })
    await expect(failed).toBeVisible()
    await page.getByRole('link', { name: EN.confirm.loginCta }).click()
    await page.waitForURL(url => url.pathname === '/en/login')
  })

  test('shows the error card when the confirm page is opened without a token', async ({ page }) => {
    await page.goto('/account/confirm')
    await expect(
      page.getByRole('heading', { level: 1, name: FR.confirm.failedTitle }),
    ).toBeVisible()
  })

  test('opens, closes with Escape and with the button the enlarged photo dialog', async ({
    page,
  }) => {
    const area = await seedArea('dialog')
    await openArea(page, area)
    const trigger = page.getByRole('button', { name: /Agrandir la photo « Avant »/ })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: /Photo agrandie : Avant du / })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()

    await page.getByRole('button', { name: /Agrandir la photo « Après »/ }).click()
    const second = page.getByRole('dialog', { name: /Photo agrandie : Après du / })
    await expect(second).toBeVisible()
    await second.getByRole('button', { name: FR.photos.close }).click()
    await expect(second).toBeHidden()
  })
})

test.describe('visitor without session', () => {
  test('redirects /account to /login', async ({ page }) => {
    await page.goto('/account')
    await page.waitForURL(url => url.pathname === '/login')
    await expect(page.getByRole('heading', { level: 1, name: FR.login.title })).toBeVisible()
  })

  test('redirects /en/account to /en/login', async ({ page }) => {
    await page.goto('/en/account')
    await page.waitForURL(url => url.pathname === '/en/login')
  })

  test('shows the neutral confirmation card for an unknown address and moves focus', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel(FR.login.email).fill(uniqueTestEmail('nobody'))
    await page.getByRole('button', { name: FR.login.submit }).click()
    const title = page.getByRole('heading', { level: 2, name: FR.login.sent.title })
    await expect(title).toBeVisible()
    await expect(title).toBeFocused()
    await page.getByRole('button', { name: FR.login.sent.retry }).click()
    await expect(page.getByLabel(FR.login.email)).toBeFocused()
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

const sessionNotice = (page: Page, formLabel: string, text: string): Locator =>
  page.getByRole('form', { name: formLabel }).getByText(text)

const signedCookies = async (page: Page): Promise<string[]> =>
  (await page.context().cookies())
    .filter(cookie => cookie.name.startsWith('sb-') && cookie.value)
    .map(cookie => cookie.name)

const refreshWith = (refreshToken: string): Promise<Response> =>
  fetch(`${readEnv('NUXT_PUBLIC_SUPABASE_URL')}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: readEnv('NUXT_PUBLIC_SUPABASE_KEY'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

test.describe('absolute session lifetime of 7 days', () => {
  const injectExpiredSession = async (page: Page, area: SeededArea): Promise<string> => {
    const session = await openPasswordSession(area.customer.id, area.customer.email)
    await page.context().addCookies([
      {
        name: sessionCookieName(),
        value: sessionCookieValue(session.raw),
        domain: 'localhost',
        path: '/',
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) + 86_400,
      },
    ])
    return session.refresh_token
  }

  test('sends an expired session to /login with a notice, then a new link reopens the area', async ({
    page,
  }) => {
    const area = await seedArea('expiredsession')
    const refreshToken = await injectExpiredSession(page, area)
    await page.goto('/account')
    await page.waitForURL(url => url.pathname === '/login' && url.search === '?session=expired')
    await expect
      .poll(async () => (await refreshWith(refreshToken)).status, { timeout: 15_000 })
      .toBeGreaterThanOrEqual(400)
    await expect(sessionNotice(page, FR.login.formLabel, FR.login.sessionExpired)).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: FR.login.sessionExpired })).toHaveCount(
      1,
    )
    await expect.poll(() => signedCookies(page)).toEqual([])
    await page.waitForLoadState('networkidle')
    expect(new URL(page.url()).pathname).toBe('/login')
    await expect(page.getByRole('link', { name: FR.nav })).toHaveAttribute('href', '/login')

    await page.goto(await confirmPath(area.customer.email, 'fr'))
    await page.waitForURL(url => url.pathname === '/account')
    await expect(page.getByRole('heading', { level: 1, name: 'Bonjour Ada' })).toBeVisible()
  })

  test('closes an expired session on /login without a redirect loop', async ({ page }) => {
    const area = await seedArea('expiredlogin')
    await injectExpiredSession(page, area)
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1, name: FR.login.title })).toBeVisible()
    await expect.poll(() => signedCookies(page)).toEqual([])
    await page.waitForLoadState('networkidle')
    expect(new URL(page.url()).pathname).toBe('/login')
  })

  test('applies to /en: /en/account goes to /en/login with the notice', async ({ page }) => {
    const area = await seedArea('expireden')
    await injectExpiredSession(page, area)
    await page.goto('/en/account')
    await page.waitForURL(url => url.pathname === '/en/login' && url.search === '?session=expired')
    await expect(sessionNotice(page, EN.login.formLabel, EN.login.sessionExpired)).toBeVisible()
  })
})

test.describe('deletion request', () => {
  test('a 401 during the request ends the session and goes to /login?session=expired', async ({
    page,
  }) => {
    const area = await seedArea('deletion401')
    await openArea(page, area)
    await page.route('**/api/account/deletion-request', route =>
      route.fulfill({ status: 401, body: '{"statusCode":401}' }),
    )
    await page.getByRole('button', { name: FR.deletion.request }).click()
    await page.getByRole('button', { name: FR.deletion.confirm }).click()
    await page.waitForURL(url => url.pathname === '/login' && url.search === '?session=expired')
    await expect(sessionNotice(page, FR.login.formLabel, FR.login.sessionExpired)).toBeVisible()
    await expect.poll(() => signedCookies(page)).toEqual([])
  })

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
  test('returns to /login within 3 seconds when the Supabase logout request is aborted', async ({
    page,
  }) => {
    const area = await seedArea('signoutabort')
    await openArea(page, area)
    await page.route('**/auth/v1/logout*', route => route.abort())
    const startedAt = Date.now()
    await page.getByRole('button', { name: FR.dashboard.signOut }).click()
    await page.waitForURL(url => url.pathname === '/login', { timeout: 6000 })
    expect(Date.now() - startedAt).toBeLessThan(5000)
    await page.goto('/account')
    await page.waitForURL(url => url.pathname === '/login')
  })

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
