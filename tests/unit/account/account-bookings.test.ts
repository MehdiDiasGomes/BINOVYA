import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadAccountBooking, loadAccountBookings } from '../../../server/utils/accountBookings'

import type { Database } from '../../../app/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

type BookingFixture = {
  id: string
  status: string
  scheduled_date?: string
}

type FakeOptions = {
  bookings: BookingFixture[]
  bookingsError?: boolean
}

type FakeCall = [string, unknown]

const CUSTOMER_ID = 'cccccccc-0000-0000-0000-000000000000'
const BOOKING_ID = 'bbbbbbbb-0000-0000-0000-000000000000'

type FakeClient = {
  client: SupabaseClient<Database>
  inCalls: FakeCall[]
  eqCalls: FakeCall[]
  orderCalls: FakeCall[]
  tables: string[]
}

const makeClient = (options: FakeOptions): FakeClient => {
  const inCalls: FakeCall[] = []
  const eqCalls: FakeCall[] = []
  const orderCalls: FakeCall[] = []
  const tables: string[] = []
  const rows = (): unknown[] =>
    options.bookings.map(row => ({
      address: 'a',
      plan: 'one_off',
      small_bin_count: 1,
      large_bin_count: 0,
      amount_total_cents: 1990,
      scheduled_date: '2026-11-01',
      ...row,
    }))
  const result = (data: unknown): unknown => ({
    data: options.bookingsError ? null : data,
    error: options.bookingsError ? { code: '42' } : null,
  })
  const bookingsQuery = {
    eq: (column: string, value: unknown) => {
      eqCalls.push([column, value])
      return bookingsQuery
    },
    in: (column: string, values: unknown) => {
      inCalls.push([column, values])
      return bookingsQuery
    },
    order: (column: string, args: unknown) => {
      orderCalls.push([column, args])
      return bookingsQuery
    },
    maybeSingle: async () => result(rows()[0] ?? null),
    then: (resolve: (value: unknown) => void) => resolve(result(rows())),
  }
  const client = {
    from: (table: string) => {
      tables.push(table)
      return { select: () => bookingsQuery }
    },
  } as unknown as SupabaseClient<Database>
  return { client, inCalls, eqCalls, orderCalls, tables }
}

beforeEach(() => {
  vi.stubGlobal('createError', (error: { statusCode: number }) =>
    Object.assign(new Error('http'), error),
  )
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('loadAccountBookings', () => {
  it('asks the database for paid, completed and cancelled bookings only', async () => {
    const { client, inCalls } = makeClient({ bookings: [] })
    await loadAccountBookings(client, CUSTOMER_ID)
    expect(inCalls).toContainEqual(['status', ['paid', 'completed', 'cancelled']])
  })

  it('filters on the customer', async () => {
    const { client, eqCalls } = makeClient({ bookings: [] })
    await loadAccountBookings(client, CUSTOMER_ID)
    expect(eqCalls).toEqual([['customer_id', CUSTOMER_ID]])
  })

  it('sorts by scheduled date descending then creation date descending', async () => {
    const { client, orderCalls } = makeClient({ bookings: [] })
    await loadAccountBookings(client, CUSTOMER_ID)
    expect(orderCalls).toEqual([
      ['scheduled_date', { ascending: false }],
      ['created_at', { ascending: false }],
    ])
  })

  it('reads the bookings table only, never the photos', async () => {
    const { client, tables } = makeClient({ bookings: [{ id: 'a', status: 'completed' }] })
    await loadAccountBookings(client, CUSTOMER_ID)
    expect(tables).toEqual(['bookings'])
  })

  it('drops a booking whose status is not shown in the area', async () => {
    const { client } = makeClient({
      bookings: [
        { id: 'a', status: 'paid' },
        { id: 'b', status: 'pending_payment' },
        { id: 'c', status: 'expired' },
      ],
    })
    const result = await loadAccountBookings(client, CUSTOMER_ID)
    expect(result.map(booking => booking.id)).toEqual(['a'])
  })

  it('maps database columns to the public camelCase shape, without photos', async () => {
    const { client } = makeClient({ bookings: [{ id: 'a', status: 'paid' }] })
    const [booking] = await loadAccountBookings(client, CUSTOMER_ID)
    expect(booking).toEqual({
      id: 'a',
      scheduledDate: '2026-11-01',
      address: 'a',
      plan: 'one_off',
      smallBinCount: 1,
      largeBinCount: 0,
      amountTotalCents: 1990,
      status: 'paid',
    })
    expect(booking).not.toHaveProperty('photos')
  })

  it('throws a 500 when the bookings query fails', async () => {
    const { client } = makeClient({ bookings: [], bookingsError: true })
    await expect(loadAccountBookings(client, CUSTOMER_ID)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Bookings unavailable',
    })
  })
})

describe('loadAccountBooking', () => {
  it('filters on the booking id, the customer id and the shown statuses', async () => {
    const { client, eqCalls, inCalls } = makeClient({ bookings: [] })
    await loadAccountBooking(client, CUSTOMER_ID, BOOKING_ID)
    expect(eqCalls).toEqual([
      ['id', BOOKING_ID],
      ['customer_id', CUSTOMER_ID],
    ])
    expect(inCalls).toEqual([['status', ['paid', 'completed', 'cancelled']]])
  })

  it('returns the mapped booking when it exists', async () => {
    const { client } = makeClient({ bookings: [{ id: BOOKING_ID, status: 'cancelled' }] })
    expect(await loadAccountBooking(client, CUSTOMER_ID, BOOKING_ID)).toMatchObject({
      booking: {
        id: BOOKING_ID,
        scheduledDate: '2026-11-01',
        address: 'a',
        plan: 'one_off',
        smallBinCount: 1,
        largeBinCount: 0,
        amountTotalCents: 1990,
        status: 'cancelled',
      },
    })
  })

  it('returns null when no row matches, so the route can answer 404', async () => {
    const { client } = makeClient({ bookings: [] })
    expect(await loadAccountBooking(client, CUSTOMER_ID, BOOKING_ID)).toBeNull()
  })

  it('returns null for a row whose status is not shown in the area', async () => {
    const { client } = makeClient({ bookings: [{ id: BOOKING_ID, status: 'pending_payment' }] })
    expect(await loadAccountBooking(client, CUSTOMER_ID, BOOKING_ID)).toBeNull()
  })

  it('throws a 500 when the query fails', async () => {
    const { client } = makeClient({ bookings: [], bookingsError: true })
    await expect(loadAccountBooking(client, CUSTOMER_ID, BOOKING_ID)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Booking unavailable',
    })
  })
})
