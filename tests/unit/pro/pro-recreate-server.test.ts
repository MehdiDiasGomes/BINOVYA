import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadRecreatePrefill } from '../../../server/utils/proRecreate'
import { THIONVILLE_ADDRESS } from '../../support/address'
import { asClient, caught, stubCreateError } from '../../support/pro-fixtures'

vi.mock('../../../server/utils/addressToken', () => ({
  readAddressTokenSecret: () => 'secret',
  signAddressToken: () => 'signed-token',
}))

const BOOKING = '99999999-2222-3333-4444-555555555555'

const bookingRow = (patch: Record<string, unknown> = {}): Record<string, unknown> => ({
  customer_id: 'cust-1',
  address: THIONVILLE_ADDRESS.label,
  city: THIONVILLE_ADDRESS.city,
  postcode: THIONVILLE_ADDRESS.postcode,
  country_code: THIONVILLE_ADDRESS.countryCode,
  latitude: THIONVILLE_ADDRESS.latitude,
  longitude: THIONVILLE_ADDRESS.longitude,
  plan: 'one_off',
  small_bin_count: 3,
  large_bin_count: 1,
  household_collection_weekdays: [],
  recycling_collection_weekdays: [],
  price_source: 'grid',
  amount_total_cents: 2900,
  admin_note: 'gate code 42',
  ...patch,
})

const customerRow = {
  email: 'ada@example.test',
  first_name: 'Ada',
  last_name: 'Lovelace',
  phone: '+33612345678',
}

const filters: Array<[string, ...unknown[]]> = []

type Reply = { data: unknown; error: unknown }

const chain = (reply: Reply, record: boolean) => {
  const node: Record<string, unknown> = {}
  const step = (name: string) =>
    vi.fn((...args: unknown[]) => {
      if (record) {
        filters.push([name, ...args])
      }
      return node
    })
  node.eq = step('eq')
  node.not = step('not')
  node.maybeSingle = vi.fn().mockResolvedValue(reply)
  return node
}

const clientWith = (booking: Reply, customer: Reply) =>
  asClient({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => chain(table === 'bookings' ? booking : customer, table === 'bookings')),
    })),
  })

beforeEach(() => {
  filters.length = 0
  stubCreateError()
})

describe('loadRecreatePrefill', () => {
  it('only reads an expired booking created by the admin that had a checkout session', async () => {
    await loadRecreatePrefill(
      clientWith({ data: bookingRow(), error: null }, { data: customerRow, error: null }),
      BOOKING,
    )
    expect(filters).toEqual([
      ['eq', 'id', BOOKING],
      ['eq', 'status', 'expired'],
      ['eq', 'created_by_admin', true],
      ['not', 'stripe_checkout_session_id', 'is', null],
    ])
  })

  it('returns null when no such booking exists', async () => {
    const prefill = await loadRecreatePrefill(
      clientWith({ data: null, error: null }, { data: customerRow, error: null }),
      BOOKING,
    )
    expect(prefill).toBeNull()
  })

  it('returns the customer, the signed address, the bins and the note', async () => {
    const prefill = await loadRecreatePrefill(
      clientWith({ data: bookingRow(), error: null }, { data: customerRow, error: null }),
      BOOKING,
    )
    expect(prefill).toMatchObject({
      contact: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.test' },
      address: { label: THIONVILLE_ADDRESS.label, token: 'signed-token' },
      smallBinCount: 3,
      largeBinCount: 1,
      quoteAmountCents: null,
      note: 'gate code 42',
    })
  })

  it('carries the quote price only for a quote booking', async () => {
    const prefill = await loadRecreatePrefill(
      clientWith(
        { data: bookingRow({ price_source: 'quote', amount_total_cents: 12000 }), error: null },
        { data: customerRow, error: null },
      ),
      BOOKING,
    )
    expect(prefill?.quoteAmountCents).toBe(12000)
  })

  it('answers 500 when the database fails', async () => {
    const error = await caught(() =>
      loadRecreatePrefill(
        clientWith({ data: null, error: { message: 'boom' } }, { data: null, error: null }),
        BOOKING,
      ),
    )
    expect(error.statusCode).toBe(500)
  })
})
