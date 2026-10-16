import { expect, test, type Locator, type Page } from '@playwright/test'

import { ACCOUNT_MESSAGES, confirmPath, seedArea, type Lang } from './support/account'
import { formatFullDate } from '../../app/utils/date'
import { assertTestStripeKey, cleanupE2eData, sleep } from '../support/db'

const FR = ACCOUNT_MESSAGES.fr
const EN = ACCOUNT_MESSAGES.en

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'
const LOADING_DELAY_MS = 2500

const hasHorizontalScroll = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)

const openArea = async (page: Page, email: string, lang: Lang = 'fr'): Promise<void> => {
  await page.goto(await confirmPath(email, lang))
  await page.waitForURL(url => url.pathname === (lang === 'fr' ? '/account' : '/en/account'))
  await expect(page.getByRole('article').first()).toBeVisible()
}

const cardOf = (page: Page, statusLabel: string): Locator =>
  page.getByRole('article').filter({ hasText: statusLabel })

const detailHeading = (page: Page, name: string | RegExp): Locator =>
  page.getByRole('heading', { level: 1, name })

const liftOf = (card: Locator): Promise<string> =>
  card.evaluate(element => getComputedStyle(element).translate)

const pulsingBlocks = (page: Page): Promise<{ total: number; exposed: number }> =>
  page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll('main .animate-pulse'))
    return {
      total: blocks.length,
      exposed: blocks.filter(block => !block.closest('[aria-hidden="true"]')).length,
    }
  })

const visibleSkeletonCards = (page: Page): Promise<number> =>
  page.evaluate(
    () =>
      Array.from(document.querySelectorAll('main ul[aria-hidden="true"] > li')).filter(
        item => item.getClientRects().length > 0,
      ).length,
  )

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
})

test.afterAll(async () => {
  const removed = await cleanupE2eData()
  console.warn(`cleanup: ${removed.bookings} bookings, ${removed.users} accounts`)
})

test.describe('booking cards on /account', () => {
  test('show the status labels and the reminder only on the upcoming card', async ({ page }) => {
    const area = await seedArea('cards')
    await openArea(page, area.customer.email)

    await expect(page.getByRole('article')).toHaveCount(3)
    await expect(cardOf(page, FR.booking.statuses.paid)).toHaveCount(1)
    await expect(cardOf(page, FR.booking.statuses.completed)).toHaveCount(1)
    await expect(cardOf(page, FR.booking.statuses.cancelled)).toHaveCount(1)

    await expect(page.getByRole('note')).toHaveCount(1)
    await expect(
      cardOf(page, FR.booking.statuses.paid).getByRole('note', { name: FR.booking.reminder.title }),
    ).toBeVisible()
    await expect(cardOf(page, FR.booking.statuses.completed).getByRole('note')).toHaveCount(0)
    await expect(cardOf(page, FR.booking.statuses.cancelled).getByRole('note')).toHaveCount(0)
  })

  test('label the amount as paid, or refunded for the cancelled card', async ({ page }) => {
    const area = await seedArea('amounts')
    await openArea(page, area.customer.email)
    await expect(cardOf(page, FR.booking.statuses.paid).getByText(FR.booking.amount)).toBeVisible()
    await expect(
      cardOf(page, FR.booking.statuses.cancelled).getByText(FR.booking.refunded, { exact: true }),
    ).toBeVisible()
  })

  test('each have one link whose accessible name includes the date', async ({ page }) => {
    const area = await seedArea('links')
    await openArea(page, area.customer.email)

    const links = page.getByRole('link', { name: /Voir la réservation du/ })
    await expect(links).toHaveCount(3)
    const paidLink = cardOf(page, FR.booking.statuses.paid).getByRole('link')
    await expect(paidLink).toHaveCount(1)
    await expect(paidLink).toHaveAccessibleName(
      `${FR.booking.view} ${FR.booking.viewContext.replace('{date}', formatFullDate('2027-03-10', 'fr'))}`,
    )
    await expect(paidLink).toHaveAttribute('href', `/account/bookings/${area.paidId}`)
  })

  test('show 2 skeleton cards at 375 px and 4 from 640 px, hidden from assistive technology', async ({
    page,
  }) => {
    const area = await seedArea('skeleton')
    await page.route('**/api/account/bookings', async route => {
      await sleep(LOADING_DELAY_MS)
      await route.continue()
    })
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto(await confirmPath(area.customer.email, 'fr'))
    await page.waitForURL(url => url.pathname === '/account')
    const live = page.getByRole('status').filter({ hasText: FR.dashboard.loading })
    await expect(live).toHaveCount(1)
    await expect(page.getByRole('article')).toHaveCount(0)
    expect(await visibleSkeletonCards(page)).toBe(2)
    const loading = await pulsingBlocks(page)
    expect(loading.total).toBeGreaterThan(0)
    expect(loading.exposed).toBe(0)
    await page.setViewportSize({ width: 800, height: 800 })
    expect(await visibleSkeletonCards(page)).toBe(4)

    await expect(page.getByRole('article')).toHaveCount(3)
    expect((await pulsingBlocks(page)).total).toBe(0)
    await expect(live).toHaveCount(0)
    await expect(page.getByRole('main').getByRole('status').first()).toHaveText('')
  })
})

test.describe('booking page', () => {
  test('opens from the card with the title focused, the summary, the placeholders and the invoice', async ({
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
      page.getByRole('heading', { level: 2, name: FR.detail.invoice.title }),
    ).toBeVisible()
    await expect(page.getByText(FR.detail.invoice.soon)).toBeVisible()
    await expect(page.getByRole('note', { name: FR.booking.reminder.title })).toBeVisible()
    await expect(page.getByRole('link', { name: FR.detail.rebook })).toHaveCount(0)
    await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)
  })

  test('returns to /account through the back link, then through the browser Back button', async ({
    page,
  }) => {
    const area = await seedArea('back')
    await openArea(page, area.customer.email)
    const greeting = detailHeading(page, 'Bonjour Ada')

    await cardOf(page, FR.booking.statuses.completed).getByRole('link').click()
    await page.waitForURL(url => url.pathname === `/account/bookings/${area.completedId}`)
    await expect(detailHeading(page, /^Ma réservation du /)).toBeFocused()
    await page.getByRole('link', { name: FR.detail.back }).click()
    await page.waitForURL(url => url.pathname === '/account')
    await expect(greeting).toBeFocused()

    await cardOf(page, FR.booking.statuses.completed).getByRole('link').click()
    await page.waitForURL(url => url.pathname === `/account/bookings/${area.completedId}`)
    await page.goBack()
    await page.waitForURL(url => url.pathname === '/account')
    await expect(greeting).toBeFocused()
  })

  test('keeps the focus where the visitor put it once the title has been focused', async ({
    page,
  }) => {
    const area = await seedArea('focusonce')
    await openArea(page, area.customer.email)
    await cardOf(page, FR.booking.statuses.paid).getByRole('link').click()
    await expect(detailHeading(page, /^Ma réservation du /)).toBeFocused()
    const back = page.getByRole('link', { name: FR.detail.back })
    await back.focus()
    await sleep(1000)
    await expect(back).toBeFocused()
  })

  test('shows no photo section but a rebook link for a cancelled booking', async ({ page }) => {
    const area = await seedArea('cancelled')
    await openArea(page, area.customer.email)
    await cardOf(page, FR.booking.statuses.cancelled).getByRole('link').click()
    await page.waitForURL(url => url.pathname === `/account/bookings/${area.cancelledId}`)
    await expect(detailHeading(page, /^Ma réservation du /)).toBeFocused()

    await expect(page.getByText(FR.booking.statuses.cancelled)).toBeVisible()
    await expect(page.getByText(FR.booking.refunded, { exact: true })).toBeVisible()
    await expect(page.getByText(FR.detail.photos.placeholder)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: FR.detail.photos.title })).toHaveCount(0)
    await expect(page.getByText(FR.detail.invoice.soon)).toBeVisible()
    await expect(page.getByRole('note')).toHaveCount(0)
    const rebook = page.getByRole('link', { name: FR.detail.rebook })
    await expect(rebook).toBeVisible()
    await rebook.click()
    await page.waitForURL(url => url.pathname === '/booking')
  })

  test('shows the photo placeholders and no reminder for a completed booking', async ({ page }) => {
    const area = await seedArea('completed')
    await page.goto(await confirmPath(area.customer.email, 'fr'))
    await page.waitForURL(url => url.pathname === '/account')
    await page.goto(`/account/bookings/${area.completedId}`)
    await expect(
      detailHeading(page, `Ma réservation du ${formatFullDate('2026-09-01', 'fr')}`),
    ).toBeFocused()
    await expect(page.getByText(FR.detail.photos.placeholder)).toHaveCount(2)
    await expect(page.getByRole('note')).toHaveCount(0)
  })

  test('answers "Réservation introuvable" for an unknown uuid, with the title focused and no alert', async ({
    page,
  }) => {
    const area = await seedArea('unknown')
    await openArea(page, area.customer.email)
    await page.goto(`/account/bookings/${UNKNOWN_ID}`)
    const title = detailHeading(page, FR.detail.notFound.title)
    await expect(title).toBeVisible()
    await expect(title).toBeFocused()
    await expect(page.getByText(FR.detail.notFound.text)).toBeVisible()
    await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)
    await expect(page.getByRole('button', { name: FR.detail.retry })).toHaveCount(0)
  })

  test('answers "Réservation introuvable" for a malformed id and for another customer booking', async ({
    page,
  }) => {
    const area = await seedArea('notmine')
    const other = await seedArea('notmine-other')
    await openArea(page, area.customer.email)

    await page.goto('/account/bookings/not-a-uuid')
    await expect(detailHeading(page, FR.detail.notFound.title)).toBeFocused()

    await page.goto(`/account/bookings/${other.paidId}`)
    await expect(detailHeading(page, FR.detail.notFound.title)).toBeFocused()
    await expect(page.getByText(formatFullDate('2027-03-10', 'fr'))).toHaveCount(0)
  })

  test('shows an alert with a retry button on a server error and keeps the focus on it', async ({
    page,
  }) => {
    const area = await seedArea('detailerror')
    await openArea(page, area.customer.email)
    const failingCalls = 4
    let calls = 0
    await page.route(`**/api/account/bookings/${area.paidId}`, async route => {
      calls += 1
      await (calls <= failingCalls ? route.fulfill({ status: 500, body: '{}' }) : route.continue())
    })
    await cardOf(page, FR.booking.statuses.paid).getByRole('link').click()
    await expect(page.getByRole('alert').filter({ hasText: FR.detail.loadError })).toBeVisible()
    const retry = page.getByRole('button', { name: FR.detail.retry })
    await retry.click()
    await expect(page.getByRole('alert').filter({ hasText: FR.detail.loadError })).toBeVisible()
    await expect(retry).toBeFocused()

    await retry.click()
    const title = detailHeading(page, /^Ma réservation du /)
    await expect(title).toBeVisible()
    await expect(title).toBeFocused()
  })

  test('keeps the focus on the retry button while the list still fails, then moves it to the bookings title', async ({
    page,
  }) => {
    const area = await seedArea('listerror')
    let isFailing = true
    await page.route('**/api/account/bookings', async route => {
      await (isFailing ? route.fulfill({ status: 500, body: '{}' }) : route.continue())
    })
    await page.goto(await confirmPath(area.customer.email, 'fr'))
    await page.waitForURL(url => url.pathname === '/account')
    const alert = page
      .getByRole('main')
      .getByRole('alert')
      .filter({ hasText: FR.dashboard.loadError })
    await expect(alert).toBeVisible()
    const retry = page.getByRole('button', { name: FR.dashboard.retry })

    await retry.click()
    await expect(alert).toBeVisible()
    await expect(retry).toBeFocused()

    isFailing = false
    await retry.click()
    await expect(page.getByRole('article').first()).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 2, name: FR.dashboard.bookingsTitle }),
    ).toBeFocused()
  })

  test('lifts the list card on hover but not the summary card of the booking page', async ({
    page,
  }) => {
    const area = await seedArea('hover')
    await openArea(page, area.customer.email)
    const listCard = cardOf(page, FR.booking.statuses.paid)
    const restingLift = await liftOf(listCard)
    await listCard.hover()
    await expect.poll(() => liftOf(listCard)).not.toBe(restingLift)

    await listCard.getByRole('link').click()
    await page.waitForURL(url => url.pathname === `/account/bookings/${area.paidId}`)
    const summary = page.getByRole('article').filter({
      has: page.getByRole('heading', { level: 2, name: FR.detail.summaryTitle }),
    })
    await expect(summary).toBeVisible()
    const summaryResting = await liftOf(summary)
    await summary.hover()
    await sleep(600)
    expect(await liftOf(summary)).toBe(summaryResting)
  })

  test('shows skeletons hidden from assistive technology, then the booking', async ({ page }) => {
    const area = await seedArea('detailskeleton')
    await openArea(page, area.customer.email)
    await page.route(`**/api/account/bookings/${area.paidId}`, async route => {
      await sleep(LOADING_DELAY_MS)
      await route.continue()
    })
    await cardOf(page, FR.booking.statuses.paid).getByRole('link').click()
    await expect(page.getByRole('status').filter({ hasText: FR.detail.loading })).toHaveCount(1)
    await expect(detailHeading(page, FR.detail.titleFallback)).toBeVisible()
    const loading = await pulsingBlocks(page)
    expect(loading.total).toBeGreaterThan(0)
    expect(loading.exposed).toBe(0)

    await expect(detailHeading(page, /^Ma réservation du /)).toBeFocused()
    expect((await pulsingBlocks(page)).total).toBe(0)
    await expect(page.getByRole('status').filter({ hasText: FR.detail.loading })).toHaveCount(0)
  })

  test.describe('at 375 px', () => {
    test.use({ viewport: { width: 375, height: 800 } })

    test('has no horizontal scroll on the list nor on the pages of a paid and a cancelled booking', async ({
      page,
    }) => {
      const area = await seedArea('mobiledetail')
      await openArea(page, area.customer.email)
      expect(await hasHorizontalScroll(page)).toBe(false)
      await page.goto(`/account/bookings/${area.paidId}`)
      await expect(page.getByRole('note', { name: FR.booking.reminder.title })).toBeVisible()
      expect(await hasHorizontalScroll(page)).toBe(false)
      await page.goto(`/account/bookings/${area.cancelledId}`)
      await expect(page.getByRole('link', { name: FR.detail.rebook })).toBeVisible()
      expect(await hasHorizontalScroll(page)).toBe(false)
    })
  })
})

test.describe('English variant', () => {
  test('opens the booking page from /en/account with English labels', async ({ page }) => {
    const area = await seedArea('en-detail')
    await openArea(page, area.customer.email, 'en')
    await expect(cardOf(page, EN.booking.statuses.paid)).toHaveCount(1)
    await expect(page.getByRole('note', { name: EN.booking.reminder.title })).toHaveCount(1)

    const date = formatFullDate('2027-03-10', 'en')
    const link = page.getByRole('link', { name: `${EN.booking.view} on ${date}` })
    await expect(link).toHaveAttribute('href', `/en/account/bookings/${area.paidId}`)
    await link.click()

    await page.waitForURL(url => url.pathname === `/en/account/bookings/${area.paidId}`)
    const title = detailHeading(page, `My booking on ${date}`)
    await expect(title).toBeFocused()
    await expect(page.getByText(EN.detail.photos.placeholder)).toHaveCount(2)
    await expect(page.getByText(EN.detail.invoice.soon)).toBeVisible()

    await page.getByRole('link', { name: EN.detail.back }).click()
    await page.waitForURL(url => url.pathname === '/en/account')
    await expect(detailHeading(page, 'Hello Ada')).toBeFocused()
  })

  test('shows "Booking not found" in English for an unknown uuid', async ({ page }) => {
    const area = await seedArea('en-unknown')
    await openArea(page, area.customer.email, 'en')
    await page.goto(`/en/account/bookings/${UNKNOWN_ID}`)
    await expect(detailHeading(page, EN.detail.notFound.title)).toBeFocused()
  })
})
