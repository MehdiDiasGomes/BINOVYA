import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { formatFullDate } from '../../../app/utils/date'
import { formatPrice } from '../../../app/utils/pricing'
import { createBooking, postSignedWebhook, sessionEvent } from '../../support/api'
import { pickFreeDates } from '../../support/dates'
import { assertTestStripeKey, cleanupE2eData, findBookings } from '../../support/db'
import { BASE_URL, adminMailbox, uniqueTestEmail } from '../../support/env'
import { findLink, htmlToText, normalizeSpaces, waitForOneMail } from '../../support/outbox'

import type { MailOutboxRecord } from '../../../app/types/email'

const FIRST_NAME = '<script>alert(1)</script>Ada'

const LAST_NAME = `O"Brien <b>&</b> ${crypto.randomUUID().slice(0, 8)}`

const CUSTOMER_EMAIL = uniqueTestEmail('mail-paid')

let date = ''
let bookingId = ''
let amountLabel = ''
let confirmation: MailOutboxRecord
let adminAlert: MailOutboxRecord

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  ;[date = ''] = await pickFreeDates(1)
  const created = await createBooking({
    email: CUSTOMER_EMAIL,
    date,
    firstName: FIRST_NAME,
    lastName: LAST_NAME,
  })
  expect(created.status).toBe(200)
  bookingId = String(created.body.bookingId)
  const amount = Number(created.body.amountTotalCents)
  amountLabel = formatPrice(amount, 'fr-FR')
  const [row] = await findBookings(CUSTOMER_EMAIL)
  const event = sessionEvent('checkout.session.completed', {
    id: bookingId,
    sessionId: row?.stripe_checkout_session_id ?? '',
    amount,
  })
  expect((await postSignedWebhook(event)).status).toBe(200)
  confirmation = await waitForOneMail({ to: CUSTOMER_EMAIL, subjectIncludes: 'est confirmée' })
  adminAlert = await waitForOneMail({
    to: adminMailbox(),
    subjectIncludes: `${LAST_NAME} ${FIRST_NAME}`,
  })
})

afterAll(async () => {
  await cleanupE2eData()
})

describe('booking confirmation mail', () => {
  it('goes to the customer with BINOVYA as reply-to and a per-booking idempotency key', () => {
    expect(confirmation.to).toBe(CUSTOMER_EMAIL)
    expect(confirmation.replyTo).toBe(adminMailbox())
    expect(confirmation.idempotencyKey).toBe(`booking-confirmation-${bookingId}`)
    expect(confirmation.from).toContain('@')
  })

  it('has the date of the intervention in the subject', () => {
    expect(confirmation.subject).toBe(
      `Votre réservation BINOVYA du ${formatFullDate(date, 'fr-FR')} est confirmée`,
    )
  })

  it('shows the booking details and the amount paid', () => {
    const text = normalizeSpaces(htmlToText(confirmation.html))
    expect(text).toContain(formatFullDate(date, 'fr-FR'))
    expect(text).toContain('12 rue de la Gare, 57100 Thionville')
    expect(text).toContain(normalizeSpaces(amountLabel))
    expect(text).toContain('Merci pour votre paiement')
  })

  it('links "Suivre ma réservation" to the login page of the test site, without a token', () => {
    expect(findLink(confirmation.html, '/login')).toBe(`${BASE_URL}/login`)
    expect(confirmation.html).toMatch(/\/login"[^>]*>Suivre ma réservation<\/a>/)
    expect(confirmation.html).not.toContain('token_hash')
  })

  it('escapes the first and last name typed by the customer', () => {
    expect(confirmation.html).not.toContain('<script')
    expect(confirmation.html).not.toContain('<b>&</b>')
    expect(confirmation.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;Ada')
  })

  it('has its styles inlined and no style block left over', () => {
    expect(confirmation.html).toMatch(/<[a-z]+ [^>]*style="/)
    expect(confirmation.html).not.toMatch(/<style[^>]*>[^@]*<\/style>/)
  })
})

describe('admin paid-booking alert mail', () => {
  it('goes to the BINOVYA mailbox with the customer as reply-to', () => {
    expect(adminAlert.to).toBe(adminMailbox())
    expect(adminAlert.replyTo).toBe(CUSTOMER_EMAIL)
    expect(adminAlert.idempotencyKey).toBe(`booking-admin-alert-${bookingId}`)
  })

  it('names the date and the customer in the subject', () => {
    expect(adminAlert.subject).toBe(
      `Nouvelle réservation payée - ${formatFullDate(date, 'fr-FR')} - ${LAST_NAME} ${FIRST_NAME}`,
    )
  })

  it('lists the customer, the booking reference and the amount', () => {
    const text = normalizeSpaces(htmlToText(adminAlert.html))
    expect(text).toContain(CUSTOMER_EMAIL)
    expect(text).toContain('+33612345678')
    expect(text).toContain(bookingId)
    expect(text).toContain(normalizeSpaces(amountLabel))
  })

  it('escapes the customer names', () => {
    expect(adminAlert.html).not.toContain('<script')
    expect(adminAlert.html).not.toContain('<b>&</b>')
  })
})
