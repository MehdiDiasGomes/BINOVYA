import { expect, test, type Locator, type Page } from '@playwright/test'

import { ACCOUNT_MESSAGES, confirmPath, seedArea } from './support/account'
import { formatFullDate } from '../../app/utils/date'
import { assertTestStripeKey, cleanupE2eData } from '../support/db'

const FR = ACCOUNT_MESSAGES.fr

const openArea = async (page: Page, email: string): Promise<void> => {
  await page.goto(await confirmPath(email, 'fr'))
  await page.waitForURL(url => url.pathname === '/account')
  await expect(page.getByRole('article').first()).toBeVisible()
}

const cardOf = (page: Page, statusLabel: string): Locator =>
  page.getByRole('article').filter({ hasText: statusLabel })

const detailHeading = (page: Page, name: string | RegExp): Locator =>
  page.getByRole('heading', { level: 1, name })

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
})

test.afterAll(async () => {
  const removed = await cleanupE2eData()
  console.warn(`cleanup: ${removed.bookings} bookings, ${removed.users} accounts`)
})

test.describe('booking page', () => {
  test('opens from the card with the title focused, the summary, the placeholders and the receipt', async ({
    page,
  }) => {
    const area = await seedArea('detail')
    await openArea(page, area.customer.email)
    await cardOf(page, FR.booking.statuses.paid).getByRole('link').click()

    await page.waitForURL(url => url.pathname === `/account/bookings/${area.paidId}`)
    const title = detailHeading(page, `Ma réservation du ${formatFullDate('2027-03-10', 'fr')}`)
    await expect(title).toBeVisible()
    await expect(title).toBeFocused()

    await expect(
      page.getByRole('heading', { level: 2, name: FR.detail.summaryTitle }),
    ).toBeVisible()
    await expect(page.getByText(FR.detail.photos.placeholder)).toHaveCount(2)
    await expect(
      page.getByRole('heading', { level: 2, name: FR.detail.photos.title }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 2, name: FR.detail.receipt.title }),
    ).toBeVisible()
    await expect(page.getByText(FR.detail.receipt.unavailable)).toBeVisible()
    await expect(page.getByRole('note', { name: FR.booking.reminder.title })).toBeVisible()
    await expect(page.getByRole('link', { name: FR.detail.rebook })).toHaveCount(0)
    await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)
  })
})
