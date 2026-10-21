import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createAdminBooking,
  createAndNotifyAdminBooking,
  paymentLinkExpiresAt,
} from '../../../server/utils/proCreateBooking'
import { THIONVILLE_ADDRESS } from '../../support/address'
import { asClient, caught, stubCreateError } from '../../support/pro-fixtures'

import type { ProCreateRequest } from '../../../app/types/proCreate'

const emails = vi.hoisted(() => ({
  sendPaymentLinkEmail: vi.fn(),
  sendOfflineBookingConfirmation: vi.fn(),
}))

const checkout = vi.hoisted(() => ({
  attachBookingCheckout: vi.fn(),
  expireUnpaidBooking: vi.fn(),
}))

vi.mock('../../../server/utils/bookingPaymentLinkEmails', () => emails)

vi.mock('../../../server/utils/bookingCheckout', () => ({
  ...checkout,
  bookingPageUrl: (_locale: string, outcome: string) => `https://site.test/booking?c=${outcome}`,
  isCheckoutInProgress: (error: { statusCode?: number }) => error.statusCode === 409,
}))

const CUSTOMER = '11111111-2222-3333-4444-555555555555'

const BOOKING = '99999999-2222-3333-4444-555555555555'

const REQUEST: ProCreateRequest = {
  requestId: '77777777-2222-3333-4444-555555555555',
  contact: {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: ' Ada@Example.test ',
    phone: '+33612345678',
  },
  address: { ...THIONVILLE_ADDRESS, token: 'token' },
  plan: 'one_off',
  smallBinCount: 1,
  largeBinCount: 0,
  householdCollectionWeekdays: [],
  recyclingCollectionWeekdays: [],
  date: '2026-11-03',
  mode: 'offline',
  quoteAmountCents: null,
  note: null,
  force: false,
}

const OK_ROW = {
  ok: true,
  reason: null,
  new_booking_id: BOOKING,
  total_cents: 2900,
  hold_expires_at: null,
  overridden_reasons: [],
  is_replay: false,
}

const rpcReturning = (row: Record<string, unknown> | null, error: unknown = null) =>
  vi.fn().mockResolvedValue({ data: row ? [row] : null, error })

const REPLAYED_AT = (ageMs: number): string => new Date(Date.now() - ageMs).toISOString()

const replayedRow = (patch: Record<string, unknown> = {}): Record<string, unknown> => ({
  status: 'pending_payment',
  payment_method: 'stripe',
  stripe_checkout_session_id: null,
  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  plan: 'one_off',
  scheduled_date: '2026-11-03',
  address: THIONVILLE_ADDRESS.label,
  city: THIONVILLE_ADDRESS.city,
  postcode: THIONVILLE_ADDRESS.postcode,
  country_code: 'FR',
  created_at: REPLAYED_AT(60_000),
  ...patch,
})

const clientWith = (rpc: ReturnType<typeof vi.fn>, row: Record<string, unknown> | null = null) =>
  asClient({
    rpc,
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }) })),
      })),
    })),
  })

const replayRpc = rpcReturning({
  ...OK_ROW,
  hold_expires_at: '2026-10-21T09:55:00Z',
  is_replay: true,
})

const linkRequest: ProCreateRequest = { ...REQUEST, mode: 'payment_link' }

beforeEach(() => {
  stubCreateError()
  vi.stubGlobal('localizedSiteUrl', (_locale: string, path: string) => `https://site.test${path}`)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  checkout.attachBookingCheckout.mockReset().mockResolvedValue('https://pay.stripe.com/c/x')
  checkout.expireUnpaidBooking.mockReset().mockResolvedValue(undefined)
  emails.sendPaymentLinkEmail.mockReset().mockResolvedValue(true)
  emails.sendOfflineBookingConfirmation.mockReset().mockResolvedValue(true)
})

describe('createAdminBooking', () => {
  it('passes the request, the customer and the 1435 minutes hold to admin_create_booking', async () => {
    const rpc = rpcReturning(OK_ROW)
    await createAdminBooking(clientWith(rpc), { customerId: CUSTOMER, request: REQUEST })
    expect(rpc).toHaveBeenCalledWith(
      'admin_create_booking',
      expect.objectContaining({
        p_customer_id: CUSTOMER,
        p_mode: 'offline',
        p_scheduled_date: '2026-11-03',
        p_address: THIONVILLE_ADDRESS.label,
        p_country_code: 'FR',
        p_force: false,
        p_hold_minutes: 1435,
      }),
    )
  })

  it('returns the booking, its price and no overridden code for a plain creation', async () => {
    const created = await createAdminBooking(clientWith(rpcReturning(OK_ROW)), {
      customerId: CUSTOMER,
      request: REQUEST,
    })
    expect(created).toEqual({
      bookingId: BOOKING,
      totalCents: 2900,
      holdExpiresAt: null,
      overriddenCodes: [],
      isReplay: false,
    })
  })

  it('maps the overridden database reasons to API codes', async () => {
    const row = { ...OK_ROW, overridden_reasons: ['out_of_area', 'day_closed'] }
    const created = await createAdminBooking(clientWith(rpcReturning(row)), {
      customerId: CUSTOMER,
      request: { ...REQUEST, force: true },
    })
    expect(created.overriddenCodes).toEqual(['outOfArea', 'dayClosed'])
  })

  it.each([
    ['invalid_input', 400, 'invalidInput'],
    ['invalid_quantities', 400, 'invalidQuantities'],
    ['quote_required', 422, 'quoteRequired'],
    ['customer_not_found', 422, 'customerNotFound'],
    ['past_date', 422, 'pastDate'],
    ['too_far', 400, 'tooFar'],
    ['customer_pending', 409, 'customerPending'],
    ['out_of_area', 409, 'outOfArea'],
    ['day_closed', 409, 'dayClosed'],
    ['day_full', 409, 'dayFull'],
    ['out_of_sector', 409, 'outOfSector'],
  ])('maps the refusal %s to %i %s', async (reason, statusCode, code) => {
    const rpc = rpcReturning({ ...OK_ROW, ok: false, reason, new_booking_id: null })
    const error = await caught(() =>
      createAdminBooking(clientWith(rpc), { customerId: CUSTOMER, request: REQUEST }),
    )
    expect(error.statusCode).toBe(statusCode)
    expect(error.data?.code).toBe(code)
  })

  it('answers 500 without a code when the database fails', async () => {
    const error = await caught(() =>
      createAdminBooking(clientWith(rpcReturning(null, { message: 'boom' })), {
        customerId: CUSTOMER,
        request: REQUEST,
      }),
    )
    expect(error.statusCode).toBe(500)
    expect(error.data).toBeUndefined()
  })

  it('answers 500 when a successful row carries no booking id', async () => {
    const error = await caught(() =>
      createAdminBooking(clientWith(rpcReturning({ ...OK_ROW, new_booking_id: null })), {
        customerId: CUSTOMER,
        request: REQUEST,
      }),
    )
    expect(error.statusCode).toBe(500)
  })
})

describe('createAndNotifyAdminBooking', () => {
  it('emails only the confirmation for an offline booking, never touching Stripe', async () => {
    const response = await createAndNotifyAdminBooking(clientWith(rpcReturning(OK_ROW)), {
      customerId: CUSTOMER,
      request: REQUEST,
    })
    expect(response).toEqual({
      bookingId: BOOKING,
      mode: 'offline',
      scheduledDate: '2026-11-03',
      amountTotalCents: 2900,
      paymentDueAt: null,
      overriddenCodes: [],
      isEmailSent: true,
      isReplay: false,
    })
    expect(emails.sendOfflineBookingConfirmation).toHaveBeenCalledTimes(1)
    expect(emails.sendPaymentLinkEmail).not.toHaveBeenCalled()
    expect(checkout.attachBookingCheckout).not.toHaveBeenCalled()
  })

  it('reports isEmailSent false when the confirmation mail fails, without failing', async () => {
    emails.sendOfflineBookingConfirmation.mockResolvedValue(false)
    const response = await createAndNotifyAdminBooking(clientWith(rpcReturning(OK_ROW)), {
      customerId: CUSTOMER,
      request: REQUEST,
    })
    expect(response.isEmailSent).toBe(false)
  })

  it('opens the Checkout before the hold ends, then emails the link with its deadline', async () => {
    const hold = '2026-10-21T09:55:00Z'
    const rpc = rpcReturning({ ...OK_ROW, hold_expires_at: hold })
    const response = await createAndNotifyAdminBooking(clientWith(rpc), {
      customerId: CUSTOMER,
      request: linkRequest,
    })
    const expiresAt = Date.parse(hold) / 1000 - 60
    expect(checkout.attachBookingCheckout.mock.calls[0]?.[1]).toMatchObject({
      bookingId: BOOKING,
      profileId: CUSTOMER,
      amountCents: 2900,
      locale: 'fr',
      expiresAt,
      cancelUrl: expect.stringContaining('/payment-link'),
    })
    expect(response.mode).toBe('payment_link')
    expect(response.paymentDueAt).toBe(new Date(expiresAt * 1000).toISOString())
    expect(emails.sendPaymentLinkEmail.mock.calls[0]?.[1]).toMatchObject({
      paymentUrl: 'https://pay.stripe.com/c/x',
      isResend: false,
    })
    expect(emails.sendOfflineBookingConfirmation).not.toHaveBeenCalled()
  })

  it('answers 502 paymentLinkFailed and sends no mail when the Checkout fails', async () => {
    checkout.attachBookingCheckout.mockRejectedValue(
      Object.assign(new Error('x'), { statusCode: 502 }),
    )
    const rpc = rpcReturning({ ...OK_ROW, hold_expires_at: '2026-10-21T09:55:00Z' })
    const error = await caught(() =>
      createAndNotifyAdminBooking(clientWith(rpc, { status: 'expired' }), {
        customerId: CUSTOMER,
        request: linkRequest,
      }),
    )
    expect(error.statusCode).toBe(502)
    expect(error.data?.code).toBe('paymentLinkFailed')
    expect(emails.sendPaymentLinkEmail).not.toHaveBeenCalled()
  })

  it('answers 409 requestInProgress when Stripe is still busy with the same key', async () => {
    checkout.attachBookingCheckout.mockRejectedValue(
      Object.assign(new Error('x'), { statusCode: 409 }),
    )
    const rpc = rpcReturning({ ...OK_ROW, hold_expires_at: '2026-10-21T09:55:00Z' })
    const error = await caught(() =>
      createAndNotifyAdminBooking(clientWith(rpc), {
        customerId: CUSTOMER,
        request: linkRequest,
      }),
    )
    expect(error.statusCode).toBe(409)
    expect(error.data?.code).toBe('requestInProgress')
  })

  it('releases the booking and answers 502 paymentLinkFailed when no hold end is returned', async () => {
    const client = clientWith(rpcReturning({ ...OK_ROW, hold_expires_at: null }))
    const error = await caught(() =>
      createAndNotifyAdminBooking(client, { customerId: CUSTOMER, request: linkRequest }),
    )
    expect(error.statusCode).toBe(502)
    expect(error.data?.code).toBe('paymentLinkFailed')
    expect(checkout.expireUnpaidBooking).toHaveBeenCalledWith(client, BOOKING)
  })
})

describe('createAndNotifyAdminBooking replays', () => {
  const replay = (row: Record<string, unknown>) =>
    createAndNotifyAdminBooking(clientWith(replayRpc, row), {
      customerId: CUSTOMER,
      request: linkRequest,
    })

  it.each(['paid', 'completed', 'cancelled'])(
    'returns the %s booking with isReplay and no mail',
    async status => {
      const response = await replay(replayedRow({ status }))
      expect(response.isReplay).toBe(true)
      expect(emails.sendPaymentLinkEmail).not.toHaveBeenCalled()
      expect(checkout.attachBookingCheckout).not.toHaveBeenCalled()
    },
  )

  it('returns an offline booking as offline with no mail', async () => {
    const response = await replay(replayedRow({ status: 'paid', payment_method: 'offline' }))
    expect(response.mode).toBe('offline')
    expect(emails.sendOfflineBookingConfirmation).not.toHaveBeenCalled()
  })

  it('answers 409 requestInProgress for a pending booking without session younger than 25 s', async () => {
    const error = await caught(() => replay(replayedRow({ created_at: REPLAYED_AT(5_000) })))
    expect(error.statusCode).toBe(409)
    expect(error.data?.code).toBe('requestInProgress')
    expect(checkout.attachBookingCheckout).not.toHaveBeenCalled()
  })

  it('opens the link and mails it once for a pending booking without session older than 25 s', async () => {
    const response = await replay(replayedRow({ created_at: REPLAYED_AT(60_000) }))
    expect(checkout.attachBookingCheckout).toHaveBeenCalledTimes(1)
    expect(emails.sendPaymentLinkEmail).toHaveBeenCalledTimes(1)
    expect(response.isReplay).toBe(true)
  })

  it('sends nothing for a pending booking that already has its session', async () => {
    const response = await replay(replayedRow({ stripe_checkout_session_id: 'cs_test_1' }))
    expect(response.mode).toBe('payment_link')
    expect(response.paymentDueAt).not.toBeNull()
    expect(emails.sendPaymentLinkEmail).not.toHaveBeenCalled()
    expect(checkout.attachBookingCheckout).not.toHaveBeenCalled()
  })

  it('answers 502 paymentLinkFailed for an expired booking', async () => {
    const error = await caught(() => replay(replayedRow({ status: 'expired' })))
    expect(error.statusCode).toBe(502)
    expect(error.data?.code).toBe('paymentLinkFailed')
  })
})

describe('paymentLinkExpiresAt', () => {
  const NOW = Date.parse('2026-10-20T10:00:00Z')

  it('ends one minute before the hold', () => {
    const hold = '2026-10-21T09:55:00Z'
    expect(paymentLinkExpiresAt(hold, NOW)).toBe(Date.parse(hold) / 1000 - 60)
  })

  it('never exceeds the 24 hours Stripe allows after creation', () => {
    const expiresAt = paymentLinkExpiresAt('2026-10-23T10:00:00Z', NOW)
    expect(expiresAt).toBe(NOW / 1000 + 86_400 - 60)
  })
})
