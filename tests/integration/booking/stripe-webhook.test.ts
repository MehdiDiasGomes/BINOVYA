import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  expireBooking as expire,
  fillDay,
  lastRow,
  newPendingBooking as newBooking,
  postSignedWebhook,
  postWebhook,
  sessionEvent,
  sign,
  stripeClient,
} from '../../support/api'
import { pickFreeDates } from '../../support/dates'
import { assertTestStripeKey, cleanupE2eData, findBookings } from '../../support/db'
import { waitForMails } from '../../support/outbox'

let days: string[] = []

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  days = await pickFreeDates(10)
})

afterAll(async () => {
  await cleanupE2eData()
})

describe('POST /api/stripe/webhook signature', () => {
  it('rejects a request without signature with 400', async () => {
    const result = await postWebhook(
      sessionEvent('checkout.session.expired', {
        id: crypto.randomUUID(),
        sessionId: 'cs_test_x',
        amount: 100,
      }),
    )
    expect(result.status).toBe(400)
  })

  it('rejects a bad signature with 400', async () => {
    const payload = sessionEvent('checkout.session.expired', {
      id: crypto.randomUUID(),
      sessionId: 'cs_test_x',
      amount: 100,
    })
    const result = await postWebhook(payload, sign(payload, 'whsec_not_the_real_secret'))
    expect(result.status).toBe(400)
  })

  it('rejects a payload altered after signing with 400', async () => {
    const payload = sessionEvent('checkout.session.expired', {
      id: crypto.randomUUID(),
      sessionId: 'cs_test_x',
      amount: 100,
    })
    const result = await postWebhook(`${payload} `, sign(payload))
    expect(result.status).toBe(400)
  })

  it('rejects an empty body with 400', async () => {
    const result = await postWebhook('', sign('x'))
    expect(result.status).toBe(400)
  })

  it('answers 200 to a signed event of an ignored type', async () => {
    const payload = JSON.stringify({
      id: 'evt_test_ignored',
      object: 'event',
      type: 'customer.created',
      data: { object: { id: 'cus_test', object: 'customer' } },
    })
    const result = await postSignedWebhook(payload)
    expect(result.status).toBe(200)
  })
})

describe('checkout.session.completed', () => {
  it('marks the booking paid and stores the payment intent', async () => {
    const booking = await newBooking('paid', days[0])
    const event = sessionEvent('checkout.session.completed', booking, {
      paymentIntent: 'pi_test_paid_1',
    })
    const result = await postSignedWebhook(event)
    expect(result.status).toBe(200)

    const row = await lastRow(booking)
    expect(row.status).toBe('paid')
    expect(row.stripe_payment_intent_id).toBe('pi_test_paid_1')
    expect(row.stripe_checkout_session_id).toBe(booking.sessionId)
  })

  it('does not send a second confirmation when the event is redelivered', async () => {
    const booking = await newBooking('mailredelivery', days[8])
    const event = sessionEvent('checkout.session.completed', booking)
    expect((await postSignedWebhook(event)).status).toBe(200)
    expect((await postSignedWebhook(event)).status).toBe(200)

    const confirmations = await waitForMails({
      to: booking.email,
      subjectIncludes: 'est confirmée',
    })
    expect(confirmations).toHaveLength(1)
  })

  it('is idempotent when the same event is redelivered', async () => {
    const booking = await newBooking('redelivery', days[0])
    const event = sessionEvent('checkout.session.completed', booking, {
      paymentIntent: 'pi_test_redeliver',
    })
    expect((await postSignedWebhook(event)).status).toBe(200)
    expect((await postSignedWebhook(event)).status).toBe(200)

    const rows = await findBookings(booking.email)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.status).toBe('paid')
    expect(rows[0]?.stripe_payment_intent_id).toBe('pi_test_redeliver')
  })

  it('leaves the booking unchanged when the amount does not match', async () => {
    const booking = await newBooking('amount', days[1])
    const event = sessionEvent('checkout.session.completed', booking, {
      amount: booking.amount + 100,
    })
    const result = await postSignedWebhook(event)
    expect(result.status).toBe(200)

    const row = await lastRow(booking)
    expect(row.status).toBe('pending_payment')
    expect(row.stripe_payment_intent_id).toBeNull()
  })

  it('leaves the booking unchanged when the session id does not match', async () => {
    const booking = await newBooking('session', days[1])
    const event = sessionEvent('checkout.session.completed', {
      ...booking,
      sessionId: 'cs_test_other',
    })
    expect((await postSignedWebhook(event)).status).toBe(200)
    expect((await lastRow(booking)).status).toBe('pending_payment')
  })

  it('answers 200 and changes nothing for an unknown booking', async () => {
    const event = sessionEvent('checkout.session.completed', {
      id: crypto.randomUUID(),
      sessionId: 'cs_test_unknown',
      amount: 2500,
    })
    expect((await postSignedWebhook(event)).status).toBe(200)
  })

  it('ignores a session that is not paid yet', async () => {
    const booking = await newBooking('unpaid', days[1])
    const event = sessionEvent('checkout.session.completed', booking, { paymentStatus: 'unpaid' })
    expect((await postSignedWebhook(event)).status).toBe(200)
    expect((await lastRow(booking)).status).toBe('pending_payment')
  })

  it('ignores a payment in a currency other than eur', async () => {
    const booking = await newBooking('currency', days[2])
    const event = sessionEvent('checkout.session.completed', booking, { currency: 'usd' })
    expect((await postSignedWebhook(event)).status).toBe(200)
    expect((await lastRow(booking)).status).toBe('pending_payment')
  })

  it('ignores a paid session that carries no payment intent', async () => {
    const booking = await newBooking('nointent', days[2])
    const event = sessionEvent('checkout.session.completed', booking, { paymentIntent: null })
    expect((await postSignedWebhook(event)).status).toBe(200)
    expect((await lastRow(booking)).status).toBe('pending_payment')
  })
})

describe('checkout.session.expired', () => {
  it('marks a pending booking expired', async () => {
    const booking = await newBooking('expired', days[3])
    await expire(booking)
    expect((await lastRow(booking)).status).toBe('expired')
  })

  it('does not touch a booking that is already paid', async () => {
    const booking = await newBooking('paidthenexpired', days[3])
    await postSignedWebhook(sessionEvent('checkout.session.completed', booking))
    expect((await lastRow(booking)).status).toBe('paid')

    const result = await postSignedWebhook(sessionEvent('checkout.session.expired', booking))
    expect(result.status).toBe(200)
    expect((await lastRow(booking)).status).toBe('paid')
  })
})

describe('late payment on an expired booking', () => {
  it('confirms the booking when its day is still available', async () => {
    const booking = await newBooking('late', days[4])
    await expire(booking)

    const result = await postSignedWebhook(
      sessionEvent('checkout.session.completed', booking, { paymentIntent: 'pi_test_late_ok' }),
    )
    expect(result.status).toBe(200)
    const row = await lastRow(booking)
    expect(row.status).toBe('paid')
    expect(row.stripe_payment_intent_id).toBe('pi_test_late_ok')
  })

  it('cancels the booking and answers 500 when the refund fails (unknown payment intent)', async () => {
    const date = days[5]
    const late = await newBooking('fullfake', date)
    await expire(late)
    await fillDay(date, 'fullfake')

    const result = await postSignedWebhook(
      sessionEvent('checkout.session.completed', late, { paymentIntent: 'pi_test_does_not_exist' }),
    )
    expect(result.status).toBe(500)
    expect((await lastRow(late)).status).toBe('cancelled')
  })

  it('cancels the booking and really refunds the payment when its day is now full', async () => {
    const date = days[6]
    const late = await newBooking('fullreal', date)
    await expire(late)
    await fillDay(date, 'fullreal')

    const stripe = stripeClient()
    const paymentIntent = await stripe.paymentIntents.create({
      amount: late.amount,
      currency: 'eur',
      payment_method: 'pm_card_visa',
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: { booking_id: late.id },
    })
    expect(paymentIntent.status).toBe('succeeded')

    const result = await postSignedWebhook(
      sessionEvent('checkout.session.completed', late, { paymentIntent: paymentIntent.id }),
    )
    expect(result.status).toBe(200)
    expect((await lastRow(late)).status).toBe('cancelled')

    const refunds = await stripe.refunds.list({ payment_intent: paymentIntent.id })
    expect(refunds.data).toHaveLength(1)
    expect(refunds.data[0]?.amount).toBe(late.amount)

    const redelivery = await postSignedWebhook(
      sessionEvent('checkout.session.completed', late, { paymentIntent: paymentIntent.id }),
    )
    expect(redelivery.status).toBe(200)
    expect((await stripe.refunds.list({ payment_intent: paymentIntent.id })).data).toHaveLength(1)
  })

  it('answers 200 and refunds only once when the payment was already refunded', async () => {
    const date = days[7]
    const late = await newBooking('alreadyrefunded', date)
    await expire(late)
    await fillDay(date, 'alreadyrefunded')

    const stripe = stripeClient()
    const paymentIntent = await stripe.paymentIntents.create({
      amount: late.amount,
      currency: 'eur',
      payment_method: 'pm_card_visa',
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: { booking_id: late.id },
    })
    await stripe.refunds.create({ payment_intent: paymentIntent.id })

    const result = await postSignedWebhook(
      sessionEvent('checkout.session.completed', late, { paymentIntent: paymentIntent.id }),
    )
    expect(result.status).toBe(200)
    expect((await lastRow(late)).status).toBe('cancelled')
    expect((await stripe.refunds.list({ payment_intent: paymentIntent.id })).data).toHaveLength(1)
  })
})
