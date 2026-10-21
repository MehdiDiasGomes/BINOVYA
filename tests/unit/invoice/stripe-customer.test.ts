import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  deleteProfileStripeCustomer,
  ensureStripeCustomer,
} from '../../../server/utils/stripeCustomer'
import { asClient, caught, stubCreateError } from '../../support/pro-fixtures'

const customers = vi.hoisted(() => ({
  create: vi.fn(),
  retrieve: vi.fn(),
  del: vi.fn(),
}))

vi.mock('../../../server/utils/stripe', () => ({ useStripe: () => ({ customers }) }))

const PROFILE = '11111111-2222-3333-4444-555555555555'

const BOOKING = '99999999-2222-3333-4444-555555555555'

const REQUEST = { profileId: PROFILE, bookingId: BOOKING, locale: 'fr' as const }

type Profile = { stripe_customer_id: string | null }

const profileRow = (patch: Partial<Profile> = {}) => ({
  id: PROFILE,
  email: 'ada@example.test',
  first_name: ' Ada ',
  last_name: ' Lovelace ',
  stripe_customer_id: null,
  ...patch,
})

const clientWith = (options: {
  profiles: Array<Record<string, unknown> | null>
  updated?: Array<{ id: string }>
}) => {
  const select = vi.fn()
  options.profiles.forEach(profile =>
    select.mockReturnValueOnce({
      eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }) })),
    }),
  )
  const updatePayloads: unknown[] = []
  const conditionalIs = vi.fn(() => ({
    select: vi.fn().mockResolvedValue({ data: options.updated ?? [{ id: PROFILE }], error: null }),
  }))
  const update = vi.fn((payload: unknown) => {
    updatePayloads.push(payload)
    return { eq: vi.fn(() => ({ is: conditionalIs })) }
  })
  return {
    client: asClient({ from: vi.fn(() => ({ select, update })) }),
    updatePayloads,
    conditionalIs,
  }
}

beforeEach(() => {
  stubCreateError()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  customers.create.mockReset().mockResolvedValue({ id: 'cus_new' })
  customers.retrieve.mockReset().mockResolvedValue({ id: 'cus_old', address: null })
  customers.del.mockReset().mockResolvedValue({ deleted: true })
})

describe('ensureStripeCustomer', () => {
  it('creates a customer from the profile, without any address, under a per-booking key', async () => {
    const { client, updatePayloads } = clientWith({ profiles: [profileRow()] })
    const result = await ensureStripeCustomer(client, REQUEST)
    expect(customers.create).toHaveBeenCalledTimes(1)
    const [params, options] = customers.create.mock.calls[0] ?? []
    expect(params).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.test',
      preferred_locales: ['fr'],
      metadata: { profile_id: PROFILE },
    })
    expect(params).not.toHaveProperty('address')
    expect(options).toEqual({ idempotencyKey: `profile-customer-${PROFILE}-${BOOKING}` })
    expect(updatePayloads).toEqual([{ stripe_customer_id: 'cus_new' }])
    expect(result).toEqual({ customerId: 'cus_new', hasAddress: false })
  })

  it('stores the id only while the profile has none', async () => {
    const { client, conditionalIs } = clientWith({ profiles: [profileRow()] })
    await ensureStripeCustomer(client, REQUEST)
    expect(conditionalIs).toHaveBeenCalledWith('stripe_customer_id', null)
  })

  it('reuses the stored customer without creating one', async () => {
    const { client } = clientWith({ profiles: [profileRow({ stripe_customer_id: 'cus_old' })] })
    const result = await ensureStripeCustomer(client, REQUEST)
    expect(customers.create).not.toHaveBeenCalled()
    expect(result.customerId).toBe('cus_old')
  })

  it('reports hasAddress true when the stored customer has a billing address', async () => {
    customers.retrieve.mockResolvedValue({ id: 'cus_old', address: { line1: '1 rue X' } })
    const { client } = clientWith({ profiles: [profileRow({ stripe_customer_id: 'cus_old' })] })
    expect((await ensureStripeCustomer(client, REQUEST)).hasAddress).toBe(true)
  })

  it('reports hasAddress false when Stripe cannot tell', async () => {
    customers.retrieve.mockRejectedValue(new Error('down'))
    const { client } = clientWith({ profiles: [profileRow({ stripe_customer_id: 'cus_old' })] })
    expect((await ensureStripeCustomer(client, REQUEST)).hasAddress).toBe(false)
  })

  it('reports hasAddress false for a deleted customer', async () => {
    customers.retrieve.mockResolvedValue({ id: 'cus_old', deleted: true })
    const { client } = clientWith({ profiles: [profileRow({ stripe_customer_id: 'cus_old' })] })
    expect((await ensureStripeCustomer(client, REQUEST)).hasAddress).toBe(false)
  })

  it('keeps the customer of the concurrent winner and deletes the one just created', async () => {
    const { client } = clientWith({
      profiles: [profileRow(), profileRow({ stripe_customer_id: 'cus_winner' })],
      updated: [],
    })
    const result = await ensureStripeCustomer(client, REQUEST)
    expect(result.customerId).toBe('cus_winner')
    expect(customers.del).toHaveBeenCalledWith('cus_new')
  })

  it('answers 500 when the profile is missing', async () => {
    const { client } = clientWith({ profiles: [null] })
    const error = await caught(() => ensureStripeCustomer(client, REQUEST))
    expect(error.statusCode).toBe(500)
  })

  it('lets a Stripe creation failure through', async () => {
    customers.create.mockRejectedValue(new Error('stripe down'))
    const { client } = clientWith({ profiles: [profileRow()] })
    await expect(ensureStripeCustomer(client, REQUEST)).rejects.toThrow('stripe down')
  })
})

describe('deleteProfileStripeCustomer', () => {
  it('returns false when the profile has no Stripe customer', async () => {
    const { client } = clientWith({ profiles: [profileRow()] })
    expect(await deleteProfileStripeCustomer(client, PROFILE)).toBe(false)
    expect(customers.del).not.toHaveBeenCalled()
  })

  it('answers 502 when Stripe refuses the deletion', async () => {
    customers.del.mockRejectedValue(Object.assign(new Error('x'), { code: 'api_error' }))
    const { client } = clientWith({ profiles: [profileRow({ stripe_customer_id: 'cus_old' })] })
    const error = await caught(() => deleteProfileStripeCustomer(client, PROFILE))
    expect(error.statusCode).toBe(502)
  })
})
