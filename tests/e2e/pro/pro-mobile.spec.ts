import { expect, test, type Locator, type Page } from '@playwright/test'

import { PRO_SIDEBAR_MIN_WIDTH } from '../../../app/constants/pro'
import SITE_FR from '../../../i18n/locales/fr'
import frPro from '../../../i18n/locales/fr/pro'
import { createCustomer, seedAccountBooking, type AccountCustomer } from '../../support/account'
import { removeE2eAdmins } from '../../support/admin'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { uniqueTestEmail } from '../../support/env'
import { signInAdmin } from '../support/pro'

const DAY = '2041-10-07'

const MOBILE = { width: 375, height: 800 }

const DESKTOP = { width: PRO_SIDEBAR_MIN_WIDTH, height: 800 }

let bookingId: string

const menuButton = (page: Page): Locator => page.getByRole('button', { name: SITE_FR.nav.menu })

const proMenuButton = (page: Page): Locator =>
  page.getByRole('button', { name: SITE_FR.nav.menu, exact: true, includeHidden: true })

const MORE_ACTIONS_PREFIX: string = frPro.card.moreName.split('{subject}')[0] ?? ''

const MIN_TOUCH_TARGET = 44

const MAX_ROW_HEIGHT = 160

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  const customer: AccountCustomer = await createCustomer({
    email: uniqueTestEmail('pro-mobile'),
    firstName: 'Ada',
  })
  bookingId = await seedAccountBooking({
    customerId: customer.id,
    status: 'paid',
    scheduledDate: DAY,
  })
})

test.afterAll(async () => {
  await cleanupE2eData()
  await removeE2eAdmins()
})

test.describe('compact intervention row', () => {
  test('is a single row at 375 px with the whole row as the link, and a 44 px menu button', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE)
    await signInAdmin(page)
    await page.goto(`/pro?date=${DAY}`)
    const rows = page.getByRole('article')
    await expect(rows).toHaveCount(1)
    const row = rows.first()
    await expect(row).toContainText('Compte Ada')
    await expect(row).toContainText(frPro.progress.todo)
    await expect(row.getByRole('button', { name: frPro.intervention.reschedule })).toHaveCount(0)

    const link = row.getByRole('link', { name: new RegExp(`^${frPro.card.actions.view}`) })
    await expect(link).toHaveAttribute('href', new RegExp(`/pro/interventions/${bookingId}`))

    const more = row.getByRole('button', { name: new RegExp(`^${MORE_ACTIONS_PREFIX}`) })
    const box = await more.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET)
    expect(box?.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET)

    const rowBox = await row.boundingBox()
    expect(rowBox?.height).toBeLessThan(MAX_ROW_HEIGHT)
  })

  test('opens the intervention page from the row and keeps the card hidden below 640 px', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE)
    await signInAdmin(page)
    await page.goto(`/pro?date=${DAY}`)
    await expect(page.getByRole('article')).toHaveCount(1)
    await page
      .getByRole('article')
      .getByRole('link', { name: new RegExp(`^${frPro.card.actions.view}`) })
      .click()
    await page.waitForURL(url => url.pathname === `/pro/interventions/${bookingId}`)
  })

  test('shows the card, not the row, from 640 px', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await signInAdmin(page)
    await page.goto(`/pro?date=${DAY}`)
    await expect(page.getByRole('article')).toHaveCount(1)
    await expect(
      page
        .getByRole('article')
        .getByRole('link', { name: new RegExp(`^${frPro.card.actions.view}`) }),
    ).toBeVisible()
    await expect(page.getByText(frPro.intervention.household)).toHaveCount(0)
  })

  test('has no horizontal scroll at 375 px', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await signInAdmin(page)
    await page.goto(`/pro?date=${DAY}`)
    await expect(page.getByRole('article')).toHaveCount(1)
    const hasScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasScroll).toBe(false)
  })
})

test.describe('burger menus', () => {
  test('the Pro menu opens, closes with Escape and gives the focus back to the button', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE)
    await signInAdmin(page)
    const button = proMenuButton(page)
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('link', { name: frPro.nav.interventions })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(button).toBeFocused()
    await expect(page.getByRole('link', { name: frPro.nav.interventions })).toBeHidden()
  })

  test('the open Pro menu has a single close cross, and closing it gives the focus back', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE)
    await signInAdmin(page)
    const button = proMenuButton(page)
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    const sheet = page.getByRole('dialog', { name: frPro.nav.brand })
    await expect(sheet).toBeVisible()
    const cross = page.getByRole('button', { name: frPro.nav.closeMenu })
    await expect(cross).toHaveCount(1)
    await expect(sheet.getByRole('button', { name: SITE_FR.nav.menu, exact: true })).toHaveCount(0)
    await cross.click()
    await expect(sheet).toBeHidden()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(button).toBeFocused()
  })

  test('the Pro menu closes on a route change', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await signInAdmin(page)
    await proMenuButton(page).click()
    await page.getByRole('link', { name: frPro.nav.interventions }).click()
    await page.waitForURL(url => url.pathname === '/pro/interventions')
    await expect(proMenuButton(page)).toHaveAttribute('aria-expanded', 'false')
  })

  test('the Pro menu is hidden from PRO_SIDEBAR_MIN_WIDTH, where the sidebar shows the links', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP)
    await signInAdmin(page)
    await expect(proMenuButton(page)).toBeHidden()
    await expect(page.getByRole('link', { name: frPro.nav.interventions })).toBeVisible()
  })

  test('the homepage menu opens, closes with Escape and focuses the services heading from its link', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const button = menuButton(page)
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape')
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(button).toBeFocused()

    await button.click()
    await page.getByRole('link', { name: SITE_FR.nav.services }).click()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('#services-heading')).toBeFocused()
  })
})
