import { expect, test, type Locator, type Page } from '@playwright/test'

import { PRO_SIDEBAR_MIN_WIDTH } from '../../../app/constants/pro'
import SITE_FR from '../../../i18n/locales/fr'
import frPro from '../../../i18n/locales/fr/pro'
import { createCustomer, seedAccountBooking, type AccountCustomer } from '../../support/account'
import { removeE2eAdmins } from '../../support/admin'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { uniqueTestEmail } from '../../support/env'
import { signInNewAdmin } from '../support/pro'

const DAY = '2041-10-07'

const MOBILE = { width: 375, height: 800 }

const DESKTOP = { width: PRO_SIDEBAR_MIN_WIDTH, height: 800 }

let bookingId: string

const menuButton = (page: Page): Locator => page.getByRole('button', { name: SITE_FR.nav.menu })

const proMenuButton = (page: Page): Locator =>
  page.getByRole('button', { name: SITE_FR.nav.menu, exact: true, includeHidden: true })

const details = (page: Page): Locator => page.locator(`#pro-intervention-details-${bookingId}`)

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

test.describe('collapsible intervention card', () => {
  test('is collapsed below 640 px, expands with "Afficher plus" and collapses again', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE)
    await signInNewAdmin(page, 'pro-card')
    await page.goto(`/pro?date=${DAY}`)
    await expect(page.getByRole('article')).toHaveCount(1)
    const toggle = page.getByRole('button', { name: /^Afficher (plus|moins) pour Compte Ada$/ })
    await expect(toggle).toHaveAccessibleName(
      `${frPro.intervention.showMore} ${frPro.intervention.toggleContext.replace('{name}', 'Compte Ada')}`,
    )
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(details(page)).toHaveAttribute('inert', '')

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(toggle).toContainText(frPro.intervention.showLess)
    await expect(details(page)).not.toHaveAttribute('inert', '')
    await expect(details(page).getByText(frPro.intervention.household)).toBeVisible()

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(details(page)).toHaveAttribute('inert', '')
  })

  test('is never inert from 640 px, also after a resize', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await signInNewAdmin(page, 'pro-resize')
    await page.goto(`/pro?date=${DAY}`)
    await expect(details(page)).toHaveAttribute('inert', '')
    await page.setViewportSize(DESKTOP)
    await expect(details(page)).not.toHaveAttribute('inert', '')
    await expect(details(page).getByText(frPro.intervention.household)).toBeVisible()
    await expect(page.getByRole('button', { name: /Afficher plus/ })).toBeHidden()
    await page.setViewportSize(MOBILE)
    await expect(details(page)).toHaveAttribute('inert', '')
  })

  test('has no horizontal scroll at 375 px', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await signInNewAdmin(page, 'pro-scroll')
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
    await signInNewAdmin(page, 'pro-burger')
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

  test('the Pro menu closes on a route change', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await signInNewAdmin(page, 'pro-burger-nav')
    await proMenuButton(page).click()
    await page.getByRole('link', { name: frPro.nav.interventions }).click()
    await page.waitForURL(url => url.pathname === '/pro/interventions')
    await expect(proMenuButton(page)).toHaveAttribute('aria-expanded', 'false')
  })

  test('the Pro menu is hidden from PRO_SIDEBAR_MIN_WIDTH, where the sidebar shows the links', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP)
    await signInNewAdmin(page, 'pro-burger-desktop')
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
