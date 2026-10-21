import { expect, test, type Browser, type Locator, type Page } from '@playwright/test'

import { formatFullDate } from '../../../app/utils/date'
import frAccount from '../../../i18n/locales/fr/account'
import frBooking from '../../../i18n/locales/fr/booking'
import frPro from '../../../i18n/locales/fr/pro'
import { createCustomer, seedAccountBooking } from '../../support/account'
import { removeE2eAdmins } from '../../support/admin'
import { stripeClient } from '../../support/api'
import {
  assertTestStripeKey,
  cleanupE2eData,
  readAdminBooking,
  readBookingStripe,
  waitForStatus,
} from '../../support/db'
import { uniqueTestEmail } from '../../support/env'
import { findLink, waitForMailCount, waitForOneMail } from '../../support/outbox'
import { FAR_RANGES, farDates, removeOverrides, saveOverride } from '../../support/pro'
import { confirmPath } from '../support/account'
import { BILLING_ADDRESS, fillCard, fillBillingAddressIfAsked } from '../support/booking'
import {
  messagePattern,
  pickCalendarDate,
  readAnnouncement,
  signInAdmin,
  watchAnnouncement,
} from '../support/pro'
import {
  CREATE,
  binField,
  chooseAddress,
  chooseGrid,
  chooseMode,
  chooseQuote,
  dateTrigger,
  fillCustomer,
  fillForm,
  openCreateForm,
  submitButton,
} from '../support/pro-create'

const [OFFLINE_DAY, LINK_DAY, CLOSED_DAY, QUOTE_DAY, RECREATE_DAY, NEW_DAY] = farDates(
  FAR_RANGES.e2eProCreate,
) as [string, string, string, string, string, string]

const DAYS: string[] = [OFFLINE_DAY, LINK_DAY, CLOSED_DAY, QUOTE_DAY, RECREATE_DAY, NEW_DAY]

const OPEN_CAPACITY = 10

const MAX_GRID_BINS = 2

const MAX_QUOTE_BINS = 50

const PAYMENT_LINK_MAIL = 'finalisez le paiement'

const ANNOUNCEMENT_NEEDLE = 'Intervention de Creee Admin créée'

const expectAnnounced = async (page: Page, pattern: RegExp): Promise<void> => {
  await expect.poll(async () => (await readAnnouncement(page))?.text ?? '').toMatch(pattern)
}

const noticeOf = (page: Page, text: RegExp | string): Locator =>
  page.getByRole('status').filter({ hasText: text })

const openCustomerBooking = async (
  browser: Browser,
  email: string,
  bookingId: string,
): Promise<Page> => {
  const context = await browser.newContext({ locale: 'fr-FR' })
  const page: Page = await context.newPage()
  await page.goto(await confirmPath(email, 'fr'))
  await page.waitForURL(url => url.pathname === '/account')
  await page.goto(`/account/bookings/${bookingId}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  return page
}

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeOverrides(DAYS)
  await Promise.all(DAYS.map(day => saveOverride(day, day === CLOSED_DAY ? 0 : OPEN_CAPACITY)))
})

test.afterAll(async () => {
  await removeOverrides(DAYS)
  await removeE2eAdmins()
  const removed = await cleanupE2eData()
  console.warn(`cleanup: ${removed.bookings} bookings, ${removed.users} accounts`)
})

test('creates an offline intervention: paid, confirmed by mail, shown as paid outside the site', async ({
  page,
  browser,
}) => {
  const email = uniqueTestEmail('pcreate-offline')
  await signInAdmin(page)
  await openCreateForm(page)
  await fillForm(page, { email, date: OFFLINE_DAY, mode: 'offline', note: 'Code portail 42' })
  await watchAnnouncement(page, ANNOUNCEMENT_NEEDLE)
  await submitButton(page, 'offline').click()

  await page.waitForURL(/\/pro\/interventions\/[0-9a-f-]{36}/)
  await expectAnnounced(
    page,
    messagePattern(CREATE.success.offline, {
      name: 'Creee Admin',
      date: formatFullDate(OFFLINE_DAY, 'fr-FR'),
    }),
  )
  await page.getByRole('button', { name: frPro.steps.details.toggle }).click()
  await expect(page.getByText('Code portail 42')).toBeVisible()

  const booking = await waitForStatus(email, 'paid')
  expect(await readBookingStripe(booking.id)).toMatchObject({
    payment_method: 'offline',
    created_by_admin: true,
    stripe_checkout_session_id: null,
  })
  expect((await readAdminBooking(booking.id)).admin_note).toBe('Code portail 42')
  await waitForOneMail({ to: email, subjectIncludes: 'est confirmée' })

  const customerPage = await openCustomerBooking(browser, email, booking.id)
  await expect(customerPage.getByText(frAccount.detail.offline.text)).toBeVisible()
  await expect(customerPage.getByText('Code portail 42')).toHaveCount(0)
  await customerPage.context().close()
})

test('creates a payment link, resends it, then the customer pays it with a billing address and gets an invoice', async ({
  page,
  browser,
}) => {
  const email = uniqueTestEmail('pcreate-link')
  await signInAdmin(page)
  await openCreateForm(page)
  await fillForm(page, { email, date: LINK_DAY, mode: 'payment_link' })
  await watchAnnouncement(page, ANNOUNCEMENT_NEEDLE)
  await submitButton(page, 'payment_link').click()

  await page.waitForURL(/\/pro\/interventions\/[0-9a-f-]{36}/)
  await expectAnnounced(
    page,
    messagePattern(CREATE.success.payment_link, {
      name: 'Creee Admin',
      date: formatFullDate(LINK_DAY, 'fr-FR'),
    }),
  )
  const booking = await waitForStatus(email, 'pending_payment')
  const first = await waitForOneMail({ to: email, subjectIncludes: PAYMENT_LINK_MAIL })

  await page.getByRole('button', { name: frPro.paymentLink.resend }).click()
  await expect(noticeOf(page, frPro.paymentLink.sent)).toHaveCount(1, { timeout: 20_000 })
  const mails = await waitForMailCount({ to: email, subjectIncludes: PAYMENT_LINK_MAIL }, 2)
  expect(mails).toHaveLength(2)

  const payUrl = findLink(first.html, 'checkout.stripe.com')
  expect(payUrl).toBeTruthy()
  const payer = await browser.newContext({ locale: 'fr-FR' })
  const payerPage: Page = await payer.newPage()
  await payerPage.goto(payUrl ?? '')
  await fillCard(payerPage, '4242424242424242')
  expect(await fillBillingAddressIfAsked(payerPage)).toBe(true)
  await payerPage.getByTestId('hosted-payment-submit-button').click()
  await payerPage.waitForURL(/\/booking\?checkout=success/, { timeout: 60_000 })
  await payer.close()

  await waitForStatus(email, 'paid')
  await expect
    .poll(async () => (await readBookingStripe(booking.id)).stripe_invoice_id, { timeout: 20_000 })
    .toMatch(/^in_/)
  const stored = await readBookingStripe(booking.id)
  const invoice = await stripeClient().invoices.retrieve(stored.stripe_invoice_id ?? '')
  expect(invoice.customer_address?.line1).toBe(BILLING_ADDRESS.line1)
  expect(invoice.customer_address?.city).toBe(BILLING_ADDRESS.city)

  const customerPage = await openCustomerBooking(browser, email, booking.id)
  await expect(
    customerPage.getByRole('heading', { level: 2, name: frAccount.detail.invoice.title }),
  ).toBeVisible()
  await expect(
    customerPage.getByRole('link', {
      name: new RegExp(`${frAccount.detail.invoice.download}|${frAccount.detail.invoice.open}`),
    }),
  ).toHaveAttribute('href', /^https:\/\/[^/]+\.stripe\.com\//)
  await customerPage.context().close()
})

test('refuses a closed day, then creates the intervention after « Forcer quand même »', async ({
  page,
}) => {
  const email = uniqueTestEmail('pcreate-closed')
  await signInAdmin(page)
  await openCreateForm(page)
  await fillForm(page, { email, date: CLOSED_DAY, mode: 'offline' })
  await submitButton(page, 'offline').click()

  const main = page.getByRole('main')
  await expect(main.getByRole('alert').filter({ hasText: CREATE.errors.dayClosed })).toBeVisible()
  await expect(submitButton(page, 'offline')).toBeEnabled()
  await page.getByRole('button', { name: CREATE.force }).click()
  await page.waitForURL(/\/pro\/interventions\/[0-9a-f-]{36}/)
  const booking = await waitForStatus(email, 'paid')
  expect(booking.scheduled_date).toBe(CLOSED_DAY)
})

test('prices a quote with typed bin counts, clamps them and keeps the quote price', async ({
  page,
}) => {
  const email = uniqueTestEmail('pcreate-quote')
  await signInAdmin(page)
  await openCreateForm(page)
  await fillCustomer(page, { email, date: QUOTE_DAY })
  await chooseAddress(page)
  await chooseQuote(page)

  const small = binField(page, 'small')
  await small.fill('60')
  await expect(small).toHaveValue(String(MAX_QUOTE_BINS))
  await expect(
    noticeOf(
      page,
      messagePattern(CREATE.bins.typedClamped, {
        service: frBooking.bins.small.title,
        max: String(MAX_QUOTE_BINS),
      }),
    ),
  ).toHaveCount(1)
  await small.fill('')
  await small.blur()
  await expect(small).toHaveValue('0')
  await small.fill('7')
  await small.blur()
  await binField(page, 'large').fill('3')
  await binField(page, 'large').blur()

  await chooseGrid(page)
  await expect(small).toHaveValue(String(MAX_GRID_BINS))
  await expect(
    noticeOf(page, messagePattern(CREATE.bins.clampedHint, { max: '2' })),
  ).not.toHaveCount(0)
  await chooseQuote(page)
  await expect(small).toHaveValue('7')
  await expect(binField(page, 'large')).toHaveValue('3')

  await page.getByLabel(CREATE.quoteAmount.label).fill('120,50')
  await chooseMode(page, 'offline')
  await pickCalendarDate(page, dateTrigger(page), QUOTE_DAY)
  await submitButton(page, 'offline').click()

  await page.waitForURL(/\/pro\/interventions\/[0-9a-f-]{36}/)
  const booking = await waitForStatus(email, 'paid')
  expect(await readAdminBooking(booking.id)).toMatchObject({
    price_source: 'quote',
    small_bin_count: 7,
    large_bin_count: 3,
    amount_total_cents: 12050,
  })
})

test('recreates an intervention whose payment link expired, prefilled', async ({ page }) => {
  const customer = await createCustomer({
    email: uniqueTestEmail('pcreate-recreate'),
    firstName: 'Relance',
  })
  const bookingId = await seedAccountBooking({
    customerId: customer.id,
    status: 'expired',
    scheduledDate: RECREATE_DAY,
    createdByAdmin: true,
    checkoutSessionId: 'cs_test_e2e_expired',
    expiresAt: new Date(Date.now() - 3_600_000).toISOString(),
    adminNote: 'Sonner avant',
  })
  await signInAdmin(page)
  await page.goto(`/pro/interventions?status=expired&from=${RECREATE_DAY}&to=${RECREATE_DAY}`)
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.getByRole('article').getByRole('link').first().click()
  await page.waitForURL(url => url.pathname === `/pro/interventions/${bookingId}`)
  await page.getByRole('link', { name: frPro.card.recreate }).click()

  await page.waitForURL(url => url.searchParams.get('from') === bookingId)
  await expect(page.getByLabel(frBooking.contact.email)).toHaveValue(customer.email)
  await expect(page.getByLabel(frPro.create.note.label)).toHaveValue('Sonner avant')
  await expect(page.getByRole('combobox', { name: frBooking.address.label })).toHaveValue(
    /Thionville/,
  )
  await expect(binField(page, 'small')).toHaveValue('1')

  await chooseMode(page, 'offline')
  await pickCalendarDate(page, dateTrigger(page), NEW_DAY)
  await submitButton(page, 'offline').click()
  await page.waitForURL(url => /\/pro\/interventions\/[0-9a-f-]{36}$/.test(url.pathname))
  const booking = await waitForStatus(customer.email, 'paid')
  expect(booking.scheduled_date).toBe(NEW_DAY)
  expect(booking.id).not.toBe(bookingId)
})
