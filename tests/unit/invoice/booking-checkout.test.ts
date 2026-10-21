import { beforeEach, describe, expect, it, vi } from 'vitest'

import { attachBookingCheckout, isCheckoutInProgress } from '../../../server/utils/bookingCheckout'
import { localizedSiteUrl, resolveSiteUrl } from '../../../server/utils/siteUrl'
import { ensureStripeCustomer } from '../../../server/utils/stripeCustomer'
import { THIONVILLE_ADDRESS } from '../../support/address'
import { asClient, caught, stubCreateError } from '../../support/pro-fixtures'

vi.mock('../../../server/utils/stripeCustomer', () => ({ ensureStripeCustomer: vi.fn() }))

const sessions = vi.hoisted(() => ({ create: vi.fn(), expire: vi.fn() }))

const BOOKING = '99999999-2222-3333-4444-555555555555'

const INPUT = {
  bookingId: BOOKING,
  profileId: '11111111-2222-3333-4444-555555555555',
  amountCents: 1990,
  plan: 'one_off' as const,
  scheduledDate: '2026-11-12',
  address: THIONVILLE_ADDRESS,
  locale: 'fr' as const,
}

const clientWith = (updateError: unknown = null) => {
  const updates: unknown[] = []
  const update = vi.fn((payload: unknown) => {
    updates.push(payload)
    const chain = {
      eq: vi.fn(() => Object.assign(Promise.resolve({ error: updateError }), chain)),
    }
    return chain
  })
  return { client: asClient({ from: vi.fn(() => ({ update })) }), updates }
}

const sentParams = (): Record<string, unknown> => sessions.create.mock.calls[0]![0]

beforeEach(() => {
  stubCreateError()
  vi.stubGlobal('useStripe', () => ({ checkout: { sessions } }))
  vi.stubGlobal('useRuntimeConfig', () => ({ siteUrl: 'https://binovya.test' }))
  vi.stubGlobal('resolveSiteUrl', resolveSiteUrl)
  vi.stubGlobal('localizedSiteUrl', localizedSiteUrl)
  vi.stubGlobal('isError', (error: unknown) => error instanceof Error)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  sessions.create.mockReset().mockResolvedValue({ id: 'cs_1', url: 'https://checkout.test/cs_1' })
  sessions.expire.mockReset().mockResolvedValue({})
  vi.mocked(ensureStripeCustomer)
    .mockReset()
    .mockResolvedValue({ customerId: 'cus_1', hasAddress: false })
})

describe('attachBookingCheckout', () => {
  it('asks for a billing address saved on the customer when it has none', async () => {
    await attachBookingCheckout(clientWith().client, INPUT)
    expect(sentParams()).toMatchObject({
      customer: 'cus_1',
      billing_address_collection: 'required',
      customer_update: { address: 'auto' },
    })
  })

  it('does not ask for an address when the customer already has one', async () => {
    vi.mocked(ensureStripeCustomer).mockResolvedValue({ customerId: 'cus_1', hasAddress: true })
    await attachBookingCheckout(clientWith().client, INPUT)
    expect(sentParams()).not.toHaveProperty('billing_address_collection')
    expect(sentParams()).not.toHaveProperty('customer_update')
  })

  it('never offers to save a card', async () => {
    await attachBookingCheckout(clientWith().client, INPUT)
    expect(sentParams().saved_payment_method_options).toEqual({
      payment_method_save: 'disabled',
      allow_redisplay_filters: ['always'],
    })
  })

  it('names the intervention address in the line and invoice descriptions', async () => {
    await attachBookingCheckout(clientWith().client, INPUT)
    const params = JSON.stringify(sentParams())
    expect(params.match(new RegExp(THIONVILLE_ADDRESS.label, 'g'))).toHaveLength(2)
  })

  it('uses one idempotency key per booking', async () => {
    await attachBookingCheckout(clientWith().client, INPUT)
    expect(sessions.create.mock.calls[0]![1]).toEqual({
      idempotencyKey: `booking-checkout-${BOOKING}`,
    })
  })

  it('returns the Checkout URL and stores the session on the booking', async () => {
    const { client, updates } = clientWith()
    await expect(attachBookingCheckout(client, INPUT)).resolves.toBe('https://checkout.test/cs_1')
    expect(updates).toEqual([{ stripe_checkout_session_id: 'cs_1' }])
  })

  it('answers 409 without releasing the booking when the idempotency key is in use', async () => {
    sessions.create.mockRejectedValue({ code: 'idempotency_key_in_use' })
    const { client, updates } = clientWith()
    const error = await caught(() => attachBookingCheckout(client, INPUT))
    expect(error.statusCode).toBe(409)
    expect(isCheckoutInProgress(error)).toBe(true)
    expect(updates).toEqual([])
  })

  it('answers 409 without releasing the booking on an idempotency error type', async () => {
    sessions.create.mockRejectedValue({ type: 'StripeIdempotencyError' })
    const { client, updates } = clientWith()
    const error = await caught(() => attachBookingCheckout(client, INPUT))
    expect(error.statusCode).toBe(409)
    expect(updates).toEqual([])
  })

  it('releases the booking and answers 502 when Stripe refuses the session', async () => {
    sessions.create.mockRejectedValue(new Error('card_error'))
    const { client, updates } = clientWith()
    const error = await caught(() => attachBookingCheckout(client, INPUT))
    expect(error.statusCode).toBe(502)
    expect(isCheckoutInProgress(error)).toBe(false)
    expect(updates).toEqual([{ status: 'expired' }])
  })

  it('expires the session and releases the booking when it cannot be stored', async () => {
    const { client, updates } = clientWith({ message: 'boom' })
    const error = await caught(() => attachBookingCheckout(client, INPUT))
    expect(error.statusCode).toBe(500)
    expect(sessions.expire).toHaveBeenCalledWith('cs_1')
    expect(updates).toContainEqual({ status: 'expired' })
  })
})
