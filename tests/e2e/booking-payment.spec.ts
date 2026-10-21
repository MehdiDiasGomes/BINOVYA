import { expect, test, type Locator, type Page } from '@playwright/test'

import { uniqueTestEmail } from '../support/env'
import {
  acceptPaymentCheckboxes,
  bookingPath,
  fillUntilPayment,
  goToStripe,
  MESSAGES,
  payButton,
  payOnStripe,
  restoreViewport,
  type BookingInput,
  type Lang,
} from './support/booking'
import { sleep } from '../../scripts/test-process'
import { pickFreeDates } from '../support/dates'
import {
  assertTestStripeKey,
  cleanupE2eData,
  findBookings,
  readPrice,
  waitForStatus,
} from '../support/db'

const LONG_DATE = (isoDate: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(`${isoDate}T12:00:00`),
  )

const STRIPE_BACK_LINK = /Retour à|Return to|Back to/

const stepTitle = (page: Page, lang: Lang, step: 'contact' | 'payment'): Locator =>
  page.getByRole('heading', { name: MESSAGES[lang].headings[step].title })

const startCheckout = async (page: Page, lang: Lang, booking: BookingInput): Promise<void> => {
  await fillUntilPayment(page, lang, booking)
  await acceptPaymentCheckboxes(page, lang)
  await goToStripe(page, lang)
}

const cancelOnStripe = async (page: Page, lang: Lang): Promise<void> => {
  await page.getByRole('link', { name: STRIPE_BACK_LINK }).first().click()
  await page.waitForURL(url => url.pathname === bookingPath(lang) && url.search === '', {
    timeout: 30_000,
  })
  await restoreViewport(page)
}

let days: string[] = []

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  days = await pickFreeDates(8)
})

test.afterAll(async () => {
  const removed = await cleanupE2eData()
  console.warn(`cleanup: ${removed.bookings} bookings, ${removed.users} accounts`)
})

test('1. happy path FR: busy button, Stripe page, success page, paid booking', async ({ page }) => {
  const lang: Lang = 'fr'
  const m = MESSAGES[lang]
  const email = uniqueTestEmail('happy')
  const isoDate = days[0]
  await fillUntilPayment(page, lang, { email, isoDate: isoDate })
  await acceptPaymentCheckboxes(page, lang)

  await page.route('**/api/booking', async route => {
    await sleep(2500)
    await route.continue()
  })
  await payButton(page, lang).click()
  const busy = page.getByRole('button', { name: m.actions.submitting })
  await expect(busy).toBeVisible()
  await expect(busy).toHaveAttribute('aria-busy', 'true')
  await expect(
    page.getByRole('status').filter({ hasText: m.actions.submittingStatus }),
  ).toHaveCount(1)

  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 })
  await expect(
    page.getByText(m.checkout.productName.replace('{plan}', m.plans.one_off.title)),
  ).toBeVisible()
  await expect(page.getByText(LONG_DATE(isoDate, 'fr-FR'), { exact: false }).first()).toBeVisible()
  await expect(page.getByText('29,00 €').first()).toBeVisible()
  await expect(page.getByText(email)).toBeVisible()

  await payOnStripe(page)
  await page.waitForURL(/\/booking\?checkout=success/, { timeout: 60_000 })
  await expect(page.getByRole('heading', { name: m.confirmation.title })).toBeVisible()
  await expect(page.locator('#booking-confirmation-title')).toBeFocused()
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await expect(
    page.getByText(
      m.confirmation.text.replace('{email}', email).replace('{date}', LONG_DATE(isoDate, 'fr-FR')),
    ),
  ).toBeVisible()
  await expect(page.getByRole('navigation', { name: m.steps.ariaLabel })).toHaveCount(0)
  await expect(page).toHaveURL(url => url.pathname === '/booking' && url.search === '')

  const booking = await waitForStatus(email, 'paid')
  expect(booking.scheduled_date).toBe(isoDate)
  expect(booking.amount_total_cents).toBe(await readPrice('one_off', 1, 0))
  expect(booking.stripe_checkout_session_id).toMatch(/^cs_test_/)
  expect(booking.stripe_payment_intent_id).toMatch(/^pi_/)
})

test('2. cancel on Stripe: draft restored, alert, focus, booking expired, repay works', async ({
  page,
}) => {
  const lang: Lang = 'fr'
  const m = MESSAGES[lang]
  const email = uniqueTestEmail('cancel')
  await startCheckout(page, lang, { email, isoDate: days[1] })
  const firstBooking = (await findBookings(email))[0]
  expect(firstBooking?.status).toBe('pending_payment')

  await cancelOnStripe(page, lang)
  await expect(stepTitle(page, lang, 'payment')).toBeVisible()
  await expect(stepTitle(page, lang, 'payment')).toBeFocused()
  await expect(page.getByRole('alert').filter({ hasText: m.errors.paymentCancelled })).toBeVisible()
  await expect(page.getByLabel(m.payment.terms)).toBeChecked()
  await expect(page.getByLabel(m.payment.binsReady)).toBeChecked()
  await waitForStatus(email, 'expired')

  await acceptPaymentCheckboxes(page, lang)
  await goToStripe(page, lang)
  const rows = await findBookings(email)
  expect(rows).toHaveLength(2)
  expect(rows.at(-1)?.status).toBe('pending_payment')

  await cancelOnStripe(page, lang)
  await waitForStatus(email, 'expired')
})

test('3. one pending booking per customer', async ({ page, context }) => {
  const lang: Lang = 'fr'
  const m = MESSAGES[lang]
  const email = uniqueTestEmail('pending')
  await startCheckout(page, lang, { email, isoDate: days[3] })

  const second = await context.newPage()
  await fillUntilPayment(second, lang, { email, isoDate: days[4] })
  await acceptPaymentCheckboxes(second, lang)
  await payButton(second, lang).click()
  await expect(second.getByRole('alert').filter({ hasText: m.errors.pendingPayment })).toBeVisible()
  await expect(stepTitle(second, lang, 'payment')).toBeVisible()
  expect(second.url()).not.toContain('stripe.com')
  const rows = await findBookings(email)
  expect(rows.filter(row => row.status === 'pending_payment')).toHaveLength(1)
  await second.close()

  await cancelOnStripe(page, lang)
  await waitForStatus(email, 'expired')
})

test('4. declined card stays pending, then 4242 pays', async ({ page }) => {
  const lang: Lang = 'fr'
  const email = uniqueTestEmail('declined')
  await startCheckout(page, lang, { email, isoDate: days[5] })

  await payOnStripe(page, '4000000000000002')
  await expect(page.getByText(/refusée|declined/i).first()).toBeVisible({ timeout: 30_000 })
  expect(page.url()).toContain('checkout.stripe.com')
  expect((await findBookings(email)).at(-1)?.status).toBe('pending_payment')

  await payOnStripe(page)
  await page.waitForURL(/\/booking\?checkout=success/, { timeout: 60_000 })
  await expect(page.getByRole('heading', { name: MESSAGES[lang].confirmation.title })).toBeVisible()
  const booking = await waitForStatus(email, 'paid')
  expect(booking.stripe_payment_intent_id).toMatch(/^pi_/)
})
