import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { formatFullDate } from '../../../app/utils/date'
import { formatPrice } from '../../../app/utils/pricing'
import {
  expireBooking,
  fillDay,
  newPendingBooking,
  payInStripeTestMode,
  postSignedWebhook,
  sessionEvent,
} from '../../support/api'
import { pickFreeDates } from '../../support/dates'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { BASE_URL, adminMailbox } from '../../support/env'
import { findLink, htmlToText, normalizeSpaces, waitForOneMail } from '../../support/outbox'

import type { MailOutboxRecord } from '../../../app/types/email'

let date = ''
let amountLabel = ''
let customerEmail = ''
let bookingId = ''
let refundMail: MailOutboxRecord

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  ;[date = ''] = await pickFreeDates(1)
  const late = await newPendingBooking('mail-refund', date)
  customerEmail = late.email
  bookingId = late.id
  amountLabel = formatPrice(late.amount, 'fr-FR')
  await expireBooking(late)
  await fillDay(date, 'mail-refund')
  const paymentIntent = await payInStripeTestMode(late)
  const result = await postSignedWebhook(
    sessionEvent('checkout.session.completed', late, { paymentIntent }),
  )
  expect(result.status).toBe(200)
  refundMail = await waitForOneMail({
    to: customerEmail,
    subjectIncludes: 'annulée et remboursée',
  })
})

afterAll(async () => {
  await cleanupE2eData()
})

describe('late payment refund mail', () => {
  it('goes to the customer with the fixed subject and BINOVYA as reply-to', () => {
    expect(refundMail.to).toBe(customerEmail)
    expect(refundMail.subject).toBe('Votre réservation BINOVYA a été annulée et remboursée')
    expect(refundMail.replyTo).toBe(adminMailbox())
    expect(refundMail.idempotencyKey).toBe(`booking-refund-${bookingId}`)
  })

  it('states the date of the cancelled intervention and the refunded amount', () => {
    const text = normalizeSpaces(htmlToText(refundMail.html))
    expect(text).toContain(formatFullDate(date, 'fr-FR'))
    expect(text).toContain(normalizeSpaces(amountLabel))
    expect(text).toContain('intégralement remboursé')
  })

  it('has a "Réserver une autre date" button to the booking page of the test site', () => {
    expect(findLink(refundMail.html, '/booking')).toBe(`${BASE_URL}/booking`)
    expect(refundMail.html).toMatch(/class="button"[^>]*>Réserver une autre date<\/a>/)
  })
})
