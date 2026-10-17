import { expect, test, type Page } from '@playwright/test'

import { ACCOUNT_MESSAGES, confirmPath, seedArea } from './support/account'
import { MESSAGES } from './support/booking'
import SITE_FR from '../../i18n/locales/fr'
import { assertTestStripeKey, cleanupE2eData } from '../support/db'

const FR = ACCOUNT_MESSAGES.fr

const MIN_TARGET_PX = 44

const hasHorizontalScroll = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)

const signIn = async (page: Page, email: string): Promise<void> => {
  await page.goto(await confirmPath(email, 'fr'))
  await page.waitForURL(url => url.pathname === '/account')
  await expect(page.getByRole('heading', { level: 1, name: 'Bonjour Ada' })).toBeVisible()
}

type FieldAudit = { name: string; description: string }

const auditInvalidFields = (page: Page): Promise<FieldAudit[]> =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLInputElement>('input[aria-invalid="true"]')).map(
      input => ({
        name: Array.from(input.labels ?? [])
          .map(label => label.textContent?.replace(/\s+/g, ' ').trim() ?? '')
          .join(' '),
        description: (input.getAttribute('aria-describedby') ?? '')
          .split(' ')
          .map(id => document.getElementById(id)?.textContent?.replace(/\s+/g, ' ').trim() ?? '')
          .join(' | '),
      }),
    ),
  )

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
})

test.afterAll(async () => {
  const removed = await cleanupE2eData()
  console.warn(`cleanup: ${removed.bookings} bookings, ${removed.users} accounts`)
})

test.describe('login page', () => {
  test('has no horizontal scroll at 375 px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    expect(await hasHorizontalScroll(page)).toBe(false)
    await page.getByLabel(FR.login.email).fill('e2e+ui@binovya.test')
    await page.getByRole('button', { name: FR.login.submit }).click()
    await expect(page.getByRole('heading', { level: 2, name: FR.login.sent.title })).toBeVisible()
    expect(await hasHorizontalScroll(page)).toBe(false)
  })

  test('focuses the field when its label is clicked, and keeps hint and error out of the label', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.getByText(FR.login.email, { exact: true }).click()
    await expect(page.getByLabel(FR.login.email)).toBeFocused()
    await expect(page.getByLabel(FR.login.email)).toHaveAccessibleName(FR.login.email)
    await expect(page.getByLabel(FR.login.email)).toHaveAccessibleDescription(FR.login.emailHint)

    await page.getByRole('button', { name: FR.login.submit }).click()
    const error = page.getByRole('alert').filter({ hasText: FR.login.errors.email })
    await expect(error).toBeVisible()
    await expect(page.getByLabel(FR.login.email)).toBeFocused()
    await expect(page.getByLabel(FR.login.email)).toHaveAccessibleName(FR.login.email)
    await expect(page.getByLabel(FR.login.email)).toHaveAccessibleDescription(
      `${FR.login.emailHint} ${FR.login.errors.email}`,
    )
  })
})

test.describe('field errors on the shared BookingField forms', () => {
  const pages: [string, string][] = [
    ['contact', 'Envoyer mon message'],
    ['quote', 'Envoyer ma demande'],
  ]

  for (const [path, submitLabel] of pages) {
    test(`announces errors on /${path} without putting them in the label`, async ({ page }) => {
      await page.goto(`/${path}`)
      await page.waitForLoadState('networkidle')
      await page.getByRole('button', { name: submitLabel }).click()
      await expect(page.getByRole('alert').first()).toBeVisible()
      const fields = await auditInvalidFields(page)
      expect(fields.length).toBeGreaterThan(0)
      for (const field of fields) {
        expect(field.description.length).toBeGreaterThan(0)
        for (const part of field.description.split(' | ')) {
          expect(field.name).not.toContain(part)
        }
      }
    })
  }

  test('announces errors on the booking contact step', async ({ page }) => {
    await page.goto('/booking')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: MESSAGES.fr.actions.continue }).click()
    await expect(page.getByRole('alert').first()).toBeVisible()
    const fields = await auditInvalidFields(page)
    expect(fields.length).toBeGreaterThan(0)
    for (const field of fields) {
      for (const part of field.description.split(' | ')) {
        expect(field.name).not.toContain(part)
      }
    }
    await page.getByText(MESSAGES.fr.contact.firstName, { exact: true }).click()
    await expect(page.getByLabel(MESSAGES.fr.contact.firstName)).toBeFocused()
  })
})

test.describe('navbar link', () => {
  test('desktop: "Espace client" leads to /login and has a 44 px target', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    const link = page.getByRole('link', { name: FR.nav })
    await expect(link).toHaveAttribute('href', '/login')
    const box = await link.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(MIN_TARGET_PX)
    await link.click()
    await page.waitForURL(url => url.pathname === '/login')
  })

  test('mobile: the menu has the link with a 44 px target', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: SITE_FR.nav.menu }).click()
    const link = page.getByRole('link', { name: FR.nav })
    await expect(link).toBeVisible()
    const box = await link.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(MIN_TARGET_PX)
    await link.click()
    await page.waitForURL(url => url.pathname === '/login')
  })

  test('points to /account once logged in', async ({ page }) => {
    const area = await seedArea('navbar')
    await page.setViewportSize({ width: 1280, height: 800 })
    await signIn(page, area.customer.email)
    await page.goto('/')
    await expect(page.getByRole('link', { name: FR.nav })).toHaveAttribute('href', '/account')
  })
})

test.describe('account page at 375 px', () => {
  test.use({ viewport: { width: 375, height: 800 } })

  test('has no horizontal scroll and shows the 3 status labels', async ({ page }) => {
    const area = await seedArea('mobile')
    await signIn(page, area.customer.email)
    expect(await hasHorizontalScroll(page)).toBe(false)
    await Promise.all(
      Object.values(FR.booking.statuses).map(status =>
        expect(page.getByText(status)).toBeVisible(),
      ),
    )
  })

  test('deletion states fit at 375 px', async ({ page }) => {
    const area = await seedArea('mobiledel')
    await signIn(page, area.customer.email)
    await page.getByRole('button', { name: FR.deletion.request }).click()
    await expect(page.getByRole('button', { name: FR.deletion.confirm })).toBeVisible()
    expect(await hasHorizontalScroll(page)).toBe(false)
  })
})

test.describe('account page errors', () => {
  test('"Réessayer" reloads the bookings and moves focus to the section title', async ({
    page,
  }) => {
    const area = await seedArea('retry')
    const failingCalls = 2
    let calls = 0
    await page.route('**/api/account/bookings', async route => {
      calls += 1
      await (calls <= failingCalls ? route.fulfill({ status: 500, body: '{}' }) : route.continue())
    })
    await page.goto(await confirmPath(area.customer.email, 'fr'))
    await page.waitForURL(url => url.pathname === '/account')
    await expect(page.getByRole('alert').filter({ hasText: FR.dashboard.loadError })).toBeVisible()
    await page.getByRole('button', { name: FR.dashboard.retry }).click()
    await expect(page.getByRole('article')).toHaveCount(3)
    await expect(
      page.getByRole('heading', { level: 2, name: FR.dashboard.bookingsTitle }),
    ).toBeFocused()
  })

  test('an expired session answered 401 sends the visitor to /login', async ({ page }) => {
    const area = await seedArea('expired')
    await page.route('**/api/account/bookings', route =>
      route.fulfill({ status: 401, body: '{"statusCode":401}' }),
    )
    await page.goto(await confirmPath(area.customer.email, 'fr'))
    await page.waitForURL(url => url.pathname === '/login')
  })
})

test.describe('restyled light pages', () => {
  const widths: number[] = [375, 768]

  for (const width of widths) {
    test(`has no horizontal scroll at ${width} px on /login, the failed confirm and /account`, async ({
      page,
    }) => {
      const area = await seedArea(`light${width}`)
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/login')
      await expect(page.getByRole('heading', { level: 1, name: FR.login.title })).toBeVisible()
      expect(await hasHorizontalScroll(page)).toBe(false)
      await page.goto('/account/confirm')
      await expect(
        page.getByRole('heading', { level: 1, name: FR.confirm.failedTitle }),
      ).toBeVisible()
      expect(await hasHorizontalScroll(page)).toBe(false)
      await signIn(page, area.customer.email)
      expect(page.url()).not.toContain('#')
      expect(await hasHorizontalScroll(page)).toBe(false)
    })
  }

  test('the light area reaches the footer on /login and /account', async ({ page }) => {
    const area = await seedArea('footer')
    await page.setViewportSize({ width: 1280, height: 1000 })
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1, name: FR.login.title })).toBeVisible()
    const gap = async (): Promise<number> => {
      const main = await page.getByRole('main').boundingBox()
      const footer = await page.getByRole('contentinfo').boundingBox()
      return (footer?.y ?? 0) - ((main?.y ?? 0) + (main?.height ?? 0))
    }
    expect(Math.abs(await gap())).toBeLessThanOrEqual(2)
    await signIn(page, area.customer.email)
    expect(Math.abs(await gap())).toBeLessThanOrEqual(2)
  })

  test('the sign-out button shows a visible focus ring from the keyboard', async ({ page }) => {
    const area = await seedArea('ring')
    await signIn(page, area.customer.email)
    const button = page.getByRole('button', { name: FR.dashboard.signOut })
    await button.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(button).toBeFocused()
    const shadow = await button.evaluate(element => getComputedStyle(element).boxShadow)
    expect(shadow).not.toBe('none')
  })
})
