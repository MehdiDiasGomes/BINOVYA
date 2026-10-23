import Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PRO_PAYMENT_LINK_STRIPE_TIMEOUT_MS } from '../../../app/constants/proCreate'
import { resendPaymentLink } from '../../../server/utils/proPaymentLink'
import { asClient, caught, stubCreateError } from '../../support/pro-fixtures'

const emails = vi.hoisted(() => ({ sendPaymentLinkEmail: vi.fn() }))

const sessionsRetrieve = vi.hoisted(() => vi.fn())

vi.mock('../../../server/utils/bookingPaymentLinkEmails', () => emails)

vi.mock('../../../server/utils/stripe', () => ({
  useStripe: () => ({ checkout: { sessions: { retrieve: sessionsRetrieve } } }),
}))

const BOOKING = '11111111-2222-3333-4444-555555555555'

const DUE_AT = '2026-10-21T09:55:00.000Z'

type ClaimResult = { data: string | null; error: unknown }

type LinkRow = {
  status: string
  stripe_checkout_session_id: string | null
  expires_at: string | null
  created_by_admin: boolean
}

const SESSION_EXPIRES_AT = Date.parse(DUE_AT) / 1000

const openRow = (patch: Partial<LinkRow> = {}): LinkRow => ({
  status: 'pending_payment',
  stripe_checkout_session_id: 'cs_test_open',
  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  created_by_admin: true,
  ...patch,
})

const clientWith = (claim: ClaimResult, row: LinkRow | null = openRow()) => {
  const rpc = vi.fn().mockResolvedValue(claim)
  return {
    rpc,
    client: asClient({
      rpc,
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }) })),
        })),
      })),
    }),
  }
}

beforeEach(() => {
  stubCreateError()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  sessionsRetrieve.mockReset().mockResolvedValue({
    status: 'open',
    url: 'https://x.stripe.com/pay',
    expires_at: SESSION_EXPIRES_AT,
  })
  emails.sendPaymentLinkEmail.mockReset().mockResolvedValue(true)
})

describe('resendPaymentLink', () => {
  it('sends the URL of the open session as a resend and answers the booking id', async () => {
    const { client } = clientWith({ data: 'ok', error: null })
    expect(await resendPaymentLink(client, BOOKING)).toEqual({ bookingId: BOOKING })
    expect(emails.sendPaymentLinkEmail).toHaveBeenCalledWith(client, {
      bookingId: BOOKING,
      paymentUrl: 'https://x.stripe.com/pay',
      paymentDueAt: DUE_AT,
      isResend: true,
    })
  })

  it.each([
    ['not_found', 404, 'notFound'],
    ['not_pending', 422, 'notPending'],
    ['expired', 422, 'linkExpired'],
    ['no_link', 422, 'noLink'],
    ['too_frequent', 429, 'tooFrequent'],
  ])('maps the claim %s to %i %s without sending', async (claim, statusCode, code) => {
    const error = await caught(() =>
      resendPaymentLink(clientWith({ data: claim, error: null }).client, BOOKING),
    )
    expect(error.statusCode).toBe(statusCode)
    expect(error.data?.code).toBe(code)
    expect(emails.sendPaymentLinkEmail).not.toHaveBeenCalled()
  })

  it('answers 500 when the claim fails', async () => {
    const error = await caught(() =>
      resendPaymentLink(clientWith({ data: null, error: { message: 'boom' } }).client, BOOKING),
    )
    expect(error.statusCode).toBe(500)
  })

  it('answers 422 noLink when the booking row carries no session', async () => {
    const { client } = clientWith(
      { data: 'ok', error: null },
      openRow({ stripe_checkout_session_id: null }),
    )
    const error = await caught(() => resendPaymentLink(client, BOOKING))
    expect(error.statusCode).toBe(422)
    expect(error.data?.code).toBe('noLink')
  })

  it.each([
    [
      'an expired session',
      { status: 'expired', url: 'https://x.stripe.com/pay', expires_at: SESSION_EXPIRES_AT },
    ],
    ['a completed session', { status: 'complete', url: null, expires_at: SESSION_EXPIRES_AT }],
    ['an open session without URL', { status: 'open', url: null, expires_at: SESSION_EXPIRES_AT }],
  ])('answers 409 linkUnavailable for %s', async (_label, session) => {
    sessionsRetrieve.mockResolvedValue(session)
    const error = await caught(() =>
      resendPaymentLink(clientWith({ data: 'ok', error: null }).client, BOOKING),
    )
    expect(error.statusCode).toBe(409)
    expect(error.data?.code).toBe('linkUnavailable')
    expect(emails.sendPaymentLinkEmail).not.toHaveBeenCalled()
  })

  it('answers 502 without code when Stripe cannot be reached, without claiming or sending', async () => {
    sessionsRetrieve.mockRejectedValue(new Error('down'))
    const { client, rpc } = clientWith({ data: 'ok', error: null })
    const error = await caught(() => resendPaymentLink(client, BOOKING))
    expect(error.statusCode).toBe(502)
    expect(error.data?.code).toBeUndefined()
    expect(rpc).not.toHaveBeenCalled()
    expect(emails.sendPaymentLinkEmail).not.toHaveBeenCalled()
  })

  it.each([
    [
      'a connection error',
      new Stripe.errors.StripeConnectionError({ message: 'timeout' }),
      'StripeConnectionError',
    ],
    [
      'an API 5xx',
      new Stripe.errors.StripeAPIError({ message: 'oops', statusCode: 500 }),
      'StripeAPIError',
    ],
    [
      'a rate limit',
      new Stripe.errors.StripeRateLimitError({ message: 'slow', statusCode: 429 }),
      'StripeRateLimitError',
    ],
    [
      'an authentication error',
      new Stripe.errors.StripeAuthenticationError({ message: 'bad key' }),
      'StripeAuthenticationError',
    ],
    ['a non-Stripe error', new Error('down'), 'unknown'],
  ])('answers 502 without code and logs only the type for %s', async (_label, failure, type) => {
    sessionsRetrieve.mockRejectedValue(failure)
    const { client, rpc } = clientWith({ data: 'ok', error: null })
    const error = await caught(() => resendPaymentLink(client, BOOKING))
    expect(error.statusCode).toBe(502)
    expect(error.data?.code).toBeUndefined()
    expect(rpc).not.toHaveBeenCalled()
    const logged = vi.mocked(console.error).mock.calls.flat().join(' ')
    expect(logged).toContain(`Checkout session unreachable for booking ${BOOKING} (${type})`)
    expect(logged).not.toContain(failure.message)
  })

  it('answers 409 linkUnavailable when Stripe no longer knows the session, without claiming', async () => {
    sessionsRetrieve.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({
        message: 'No such checkout.session',
        statusCode: 404,
      }),
    )
    const { client, rpc } = clientWith({ data: 'ok', error: null })
    const error = await caught(() => resendPaymentLink(client, BOOKING))
    expect(error.statusCode).toBe(409)
    expect(error.data?.code).toBe('linkUnavailable')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('reads the session with a short timeout and no network retry', async () => {
    const { client } = clientWith({ data: 'ok', error: null })
    await resendPaymentLink(client, BOOKING)
    expect(sessionsRetrieve).toHaveBeenCalledWith(
      'cs_test_open',
      {},
      { timeout: PRO_PAYMENT_LINK_STRIPE_TIMEOUT_MS, maxNetworkRetries: 0 },
    )
  })

  it('answers 502 emailFailed when the mail is not accepted', async () => {
    emails.sendPaymentLinkEmail.mockResolvedValue(false)
    const error = await caught(() =>
      resendPaymentLink(clientWith({ data: 'ok', error: null }).client, BOOKING),
    )
    expect(error.statusCode).toBe(502)
    expect(error.data?.code).toBe('emailFailed')
  })

  it('answers 404 notFound for a booking not created by an admin, without Stripe or quota', async () => {
    const { client, rpc } = clientWith(
      { data: 'ok', error: null },
      openRow({ created_by_admin: false }),
    )
    const error = await caught(() => resendPaymentLink(client, BOOKING))
    expect(error.statusCode).toBe(404)
    expect(sessionsRetrieve).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('answers 404 notFound for an unknown booking', async () => {
    const { client } = clientWith({ data: 'ok', error: null }, null)
    const error = await caught(() => resendPaymentLink(client, BOOKING))
    expect(error.statusCode).toBe(404)
  })

  it('opens the session before claiming the quota, so a closed session consumes nothing', async () => {
    sessionsRetrieve.mockResolvedValue({ status: 'expired', url: null, expires_at: 1 })
    const { client, rpc } = clientWith({ data: 'ok', error: null })
    const error = await caught(() => resendPaymentLink(client, BOOKING))
    expect(error.data?.code).toBe('linkUnavailable')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('announces the session expiry as the deadline', async () => {
    const { client } = clientWith({ data: 'ok', error: null })
    await resendPaymentLink(client, BOOKING)
    expect(emails.sendPaymentLinkEmail.mock.calls[0]?.[1].paymentDueAt).toBe(
      new Date(SESSION_EXPIRES_AT * 1000).toISOString(),
    )
  })

  it('lets the claim refuse an elapsed hold without calling Stripe', async () => {
    const { client } = clientWith(
      { data: 'expired', error: null },
      openRow({ expires_at: '2020-01-01T00:00:00Z' }),
    )
    const error = await caught(() => resendPaymentLink(client, BOOKING))
    expect(error.data?.code).toBe('linkExpired')
    expect(sessionsRetrieve).not.toHaveBeenCalled()
  })
})
