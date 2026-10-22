import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test'

import { PUBLIC_PAGE_PATHS, SEO_LOCALE_PATH_PREFIXES } from '../../../app/constants/seo'
import frPro from '../../../i18n/locales/fr/pro'
import { createCustomer, pngFixture, seedAccountBooking, seedPhoto } from '../../support/account'
import { createAdmin, removeE2eAdmins } from '../../support/admin'
import { pickFreeDates } from '../../support/dates'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { CADDY_ORIGIN, uniqueTestEmail } from '../../support/env'
import { parisDateFromToday } from '../../support/seed'
import { ACCOUNT_MESSAGES, confirmPath } from '../support/account'
import {
  acceptPaymentCheckboxes,
  bookingPath,
  fillUntilPayment,
  goToStripe,
  STRIPE_BACK_LINK,
} from '../support/booking'
import { watchBrowserIssues, type BrowserIssue } from '../support/csp-monitor'
import { moreActions, proConfirmPath, waitForHydration } from '../support/pro'

const ORIGIN: string = CADDY_ORIGIN

const PUBLIC_PATHS: string[] = [
  ...Object.values(SEO_LOCALE_PATH_PREFIXES).flatMap((prefix: string): string[] =>
    PUBLIC_PAGE_PATHS.map((path: string): string =>
      path === '/' ? prefix || '/' : `${prefix}${path}`,
    ),
  ),
  '/login',
  '/pro/login',
]

type Session = { context: BrowserContext; page: Page; issues: BrowserIssue[] }

const openSession = async (browser: Browser): Promise<Session> => {
  const context: BrowserContext = await browser.newContext({
    baseURL: ORIGIN,
    ignoreHTTPSErrors: true,
    locale: 'fr-FR',
  })
  const issues: BrowserIssue[] = await watchBrowserIssues(context, ORIGIN)
  return { context, page: await context.newPage(), issues }
}

const loadedWidths = (images: Locator): Promise<number[]> =>
  images.evaluateAll(elements =>
    elements.map(element => (element as HTMLImageElement).naturalWidth),
  )

const injectForeignScript = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const script: HTMLScriptElement = document.createElement('script')
    script.src = 'https://example.com/injected.js'
    document.head.append(script)
  })

const countCspIssues = (issues: BrowserIssue[]): number =>
  issues.filter(issue => issue.kind === 'csp').length

const expectHydrated = async (page: Page): Promise<void> => {
  await waitForHydration(page)
  await expect(page.locator('main')).toBeVisible()
}

const visit = async (page: Page, path: string): Promise<void> => {
  await page.goto(path)
  await expectHydrated(page)
  await page.waitForLoadState('networkidle')
}

let customerEmail = ''
let completedId = ''
let adminEmail = ''
let paidTodayId = ''
let days: string[] = []

test.describe('Content-Security-Policy behind Caddy', () => {
  test.skip(!ORIGIN, 'CADDY_BASE_URL is not set')

  test.beforeAll(async () => {
    assertTestStripeKey()
    await cleanupE2eData()
    await removeE2eAdmins()
    days = await pickFreeDates(2)
    customerEmail = uniqueTestEmail('infra-cust')
    const customer = await createCustomer({ email: customerEmail, firstName: 'Ada' })
    completedId = await seedAccountBooking({
      customerId: customer.id,
      status: 'completed',
      scheduledDate: '2026-09-01',
    })
    await seedPhoto({ bookingId: completedId, kind: 'before' })
    await seedPhoto({ bookingId: completedId, kind: 'after' })
    paidTodayId = await seedAccountBooking({
      customerId: customer.id,
      status: 'paid',
      scheduledDate: parisDateFromToday(0),
    })
    adminEmail = (await createAdmin(uniqueTestEmail('infra-admin'))).email
  })

  test.afterAll(async () => {
    await cleanupE2eData()
    await removeE2eAdmins()
  })

  for (const path of PUBLIC_PATHS) {
    test(`public page ${path} hydrates with no violation`, async ({ browser }) => {
      const { context, page, issues } = await openSession(browser)
      await visit(page, path)
      expect(issues).toEqual([])
      await context.close()
    })
  }

  test('the monitor reports a script injected from a foreign origin', async ({ browser }) => {
    const { context, page, issues } = await openSession(browser)
    await visit(page, '/')
    await injectForeignScript(page)
    await expect.poll(() => countCspIssues(issues)).toBeGreaterThan(0)
    await context.close()
  })

  test('booking journey reaches Stripe Checkout and comes back with no violation', async ({
    browser,
  }) => {
    const { context, page, issues } = await openSession(browser)
    const isoDate: string = days[0] ?? ''
    await fillUntilPayment(page, 'fr', { email: uniqueTestEmail('infra-book'), isoDate })
    await acceptPaymentCheckboxes(page, 'fr')
    await goToStripe(page, 'fr')
    await page.getByRole('link', { name: STRIPE_BACK_LINK }).first().click()
    await page.waitForURL(url => url.origin === ORIGIN && url.pathname === bookingPath('fr'), {
      timeout: 30_000,
    })
    await expectHydrated(page)
    await page.waitForLoadState('networkidle')
    expect(issues).toEqual([])
    await context.close()
  })

  test('customer area: session cookie is Secure, list and booking detail show signed photos', async ({
    browser,
  }) => {
    const { context, page, issues } = await openSession(browser)
    await page.goto(await confirmPath(customerEmail, 'fr'))
    await page.waitForURL(url => url.pathname === '/account')
    await expectHydrated(page)
    await expect(page.getByRole('article').first()).toBeVisible()
    const sessionCookies = (await context.cookies(ORIGIN)).filter(cookie =>
      cookie.name.startsWith('sb-'),
    )
    expect(sessionCookies.length).toBeGreaterThan(0)
    expect(sessionCookies.every(cookie => cookie.secure)).toBe(true)

    await page.goto(`/account/bookings/${completedId}`)
    await expectHydrated(page)
    await expect(
      page.getByRole('heading', { level: 2, name: ACCOUNT_MESSAGES.fr.detail.photos.title }),
    ).toBeVisible()
    const photos = page.locator('main img[src*="supabase.co"]')
    await expect.poll(() => loadedWidths(photos)).not.toContain(0)
    expect(issues).toEqual([])
    await context.close()
  })

  test('Pro space: planning, lists, availability, detail, photo preview and reschedule dialog', async ({
    browser,
  }) => {
    const { context, page, issues } = await openSession(browser)
    await page.goto(await proConfirmPath(adminEmail))
    await page.waitForURL(url => url.pathname === '/pro')
    await expectHydrated(page)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await visit(page, `/pro?date=${parisDateFromToday(0)}`)
    await moreActions(page).click()
    await page.getByRole('menuitem', { name: frPro.intervention.reschedule }).click()
    const dialog = page.getByRole('dialog', { name: frPro.reschedule.title })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)

    await visit(page, '/pro/interventions')
    await visit(page, '/pro/availability')
    await visit(page, `/pro/interventions/${paidTodayId}?step=2`)
    await page.locator('input[type="file"]').setInputFiles({
      name: 'before.png',
      mimeType: 'image/png',
      buffer: Buffer.from(pngFixture([40, 150, 90])),
    })
    await expect(page.locator('main img[src^="blob:"]').first()).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(issues).toEqual([])
    await context.close()
  })
})
