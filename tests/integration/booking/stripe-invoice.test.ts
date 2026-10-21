import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createPaidInvoice,
  expireBooking,
  lastRow,
  newPendingBooking,
  postSignedWebhook,
  sessionEvent,
  stripeClient,
} from '../../support/api'
import { pickFreeDates } from '../../support/dates'
import { assertTestStripeKey, cleanupE2eData, readBookingStripe } from '../../support/db'
import { mailsAfterSettling, waitForMails } from '../../support/outbox'
import { readOverride, removeOverrides, saveOverride } from '../../support/pro'

let freeDays: string[] = []

const closedByTest: string[] = []

const closeDay = async (date: string): Promise<void> => {
  if (!(await readOverride(date))) {
    closedByTest.push(date)
  }
  await saveOverride(date, 0)
}

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  freeDays = await pickFreeDates(6)
})

afterAll(async () => {
  await removeOverrides(closedByTest)
  await cleanupE2eData()
})

describe('invoice link on checkout.session.completed', () => {
  it('stores the invoice id of the paid session', async () => {
    const booking = await newPendingBooking('inv-store', freeDays[0] ?? '')
    const event = sessionEvent('checkout.session.completed', booking, {
      invoice: 'in_test_store_1',
    })
    expect((await postSignedWebhook(event)).status).toBe(200)

    const row = await readBookingStripe(booking.id)
    expect(row.status).toBe('paid')
    expect(row.stripe_invoice_id).toBe('in_test_store_1')
  })

  it('keeps one invoice and one confirmation mail when the event is replayed', async () => {
    const booking = await newPendingBooking('inv-replay', freeDays[1] ?? '')
    const event = sessionEvent('checkout.session.completed', booking, {
      invoice: 'in_test_replay_1',
    })
    expect((await postSignedWebhook(event)).status).toBe(200)
    expect((await postSignedWebhook(event)).status).toBe(200)

    expect((await readBookingStripe(booking.id)).stripe_invoice_id).toBe('in_test_replay_1')
    const confirmations = await waitForMails({
      to: booking.email,
      subjectIncludes: 'est confirmée',
    })
    expect(confirmations).toHaveLength(1)
    expect(
      await mailsAfterSettling({ to: booking.email, subjectIncludes: 'est confirmée' }),
    ).toHaveLength(1)
  })

  it('links the invoice on a replay when the first delivery carried none, without a second mail', async () => {
    const booking = await newPendingBooking('inv-late-link', freeDays[2] ?? '')
    const paymentIntent = 'pi_test_late_link'
    const withoutInvoice = sessionEvent('checkout.session.completed', booking, { paymentIntent })
    const withInvoice = sessionEvent('checkout.session.completed', booking, {
      paymentIntent,
      invoice: 'in_test_late_link',
    })
    expect((await postSignedWebhook(withoutInvoice)).status).toBe(200)
    expect((await readBookingStripe(booking.id)).stripe_invoice_id).toBeNull()

    expect((await postSignedWebhook(withInvoice)).status).toBe(200)
    expect((await readBookingStripe(booking.id)).stripe_invoice_id).toBe('in_test_late_link')
    const mails = await mailsAfterSettling({ to: booking.email, subjectIncludes: 'est confirmée' })
    expect(mails).toHaveLength(1)
  })

  it('never overwrites an invoice already stored', async () => {
    const booking = await newPendingBooking('inv-keep', freeDays[3] ?? '')
    const paymentIntent = 'pi_test_keep_invoice'
    const first = sessionEvent('checkout.session.completed', booking, {
      paymentIntent,
      invoice: 'in_test_first',
    })
    const second = sessionEvent('checkout.session.completed', booking, {
      paymentIntent,
      invoice: 'in_test_second',
    })
    expect((await postSignedWebhook(first)).status).toBe(200)
    expect((await postSignedWebhook(second)).status).toBe(200)
    expect((await readBookingStripe(booking.id)).stripe_invoice_id).toBe('in_test_first')
  })
})

describe('late payment refund and credit note', () => {
  it('refunds a payment on a day closed since, with a credit note linked to the refund', async () => {
    const booking = await newPendingBooking('inv-credit', freeDays[4] ?? '')
    await expireBooking(booking)
    await closeDay(freeDays[4] ?? '')
    const { invoiceId, paymentIntentId } = await createPaidInvoice(booking.amount)
    const event = sessionEvent('checkout.session.completed', booking, {
      paymentIntent: paymentIntentId,
      invoice: invoiceId,
    })

    expect((await postSignedWebhook(event)).status).toBe(200)
    expect((await lastRow(booking)).status).toBe('cancelled')

    const stripe = stripeClient()
    const refunds = await stripe.refunds.list({ payment_intent: paymentIntentId })
    expect(refunds.data).toHaveLength(1)
    const creditNotes = await stripe.creditNotes.list({ invoice: invoiceId })
    expect(creditNotes.data).toHaveLength(1)
    expect(creditNotes.data[0]?.total).toBe(booking.amount)
    expect(creditNotes.data[0]?.refunds.map(link => link.refund)).toEqual([refunds.data[0]?.id])
    const refundMails = await waitForMails({ to: booking.email, subjectIncludes: 'rembours' })
    expect(refundMails).toHaveLength(1)

    expect((await postSignedWebhook(event)).status).toBe(200)
    expect((await stripe.creditNotes.list({ invoice: invoiceId })).data).toHaveLength(1)
    expect(
      await mailsAfterSettling({ to: booking.email, subjectIncludes: 'rembours' }),
    ).toHaveLength(1)
  })

  it('still refunds and mails the customer when the credit note fails', async () => {
    const booking = await newPendingBooking('inv-credit-fail', freeDays[5] ?? '')
    await expireBooking(booking)
    await closeDay(freeDays[5] ?? '')
    const { paymentIntentId } = await createPaidInvoice(booking.amount)
    const event = sessionEvent('checkout.session.completed', booking, {
      paymentIntent: paymentIntentId,
      invoice: 'in_test_does_not_exist',
    })

    expect((await postSignedWebhook(event)).status).toBe(200)
    expect((await lastRow(booking)).status).toBe('cancelled')
    const refunds = await stripeClient().refunds.list({ payment_intent: paymentIntentId })
    expect(refunds.data).toHaveLength(1)
    expect(await waitForMails({ to: booking.email, subjectIncludes: 'rembours' })).toHaveLength(1)
  })
})
