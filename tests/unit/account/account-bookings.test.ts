import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadAccountBookings } from '../../../server/utils/accountBookings'

import type { Database } from '../../../app/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

type BookingFixture = {
  id: string
  status: string
  scheduled_date?: string
}

type PhotoFixture = { booking_id: string; kind: 'before' | 'after'; storage_path: string }

type FakeOptions = {
  bookings: BookingFixture[]
  photos?: PhotoFixture[]
  bookingsError?: boolean
  photosError?: boolean
  signError?: boolean
}

const CUSTOMER_ID = 'cccccccc-0000-0000-0000-000000000000'

type FakeClient = {
  client: SupabaseClient<Database>
  inCalls: [string, unknown][]
  orderCalls: [string, unknown][]
  signed: ReturnType<typeof vi.fn>
}

const makeClient = (options: FakeOptions): FakeClient => {
  const inCalls: [string, unknown][] = []
  const orderCalls: [string, unknown][] = []
  const signed = vi.fn(async (paths: string[]) => ({
    data: paths.map(path => ({ path, signedUrl: `https://signed.test/${path}?t=1`, error: null })),
    error: options.signError ? { message: 'boom' } : null,
  }))
  const bookingsQuery = {
    eq: () => bookingsQuery,
    in: (column: string, values: unknown) => {
      inCalls.push([`bookings.${column}`, values])
      return bookingsQuery
    },
    order: (column: string, args: unknown) => {
      orderCalls.push([column, args])
      return bookingsQuery
    },
    then: (resolve: (value: unknown) => void) =>
      resolve({
        data: options.bookingsError
          ? null
          : options.bookings.map(row => ({
              address: 'a',
              plan: 'one_off',
              small_bin_count: 1,
              large_bin_count: 0,
              amount_total_cents: 1990,
              scheduled_date: '2026-11-01',
              ...row,
            })),
        error: options.bookingsError ? { code: '42' } : null,
      }),
  }
  const photosQuery = {
    in: (column: string, values: unknown) => {
      inCalls.push([`photos.${column}`, values])
      return {
        then: (resolve: (value: unknown) => void) =>
          resolve({
            data: options.photosError ? null : (options.photos ?? []),
            error: options.photosError ? { code: '42' } : null,
          }),
      }
    },
  }
  const client = {
    from: (table: string) => ({
      select: () => (table === 'bookings' ? bookingsQuery : photosQuery),
    }),
    storage: { from: () => ({ createSignedUrls: signed }) },
  } as unknown as SupabaseClient<Database>
  return { client, inCalls, orderCalls, signed }
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
    expect(inCalls).toContainEqual(['bookings.status', ['paid', 'completed', 'cancelled']])
  })

  it('sorts by scheduled date descending then creation date descending', async () => {
    const { client, orderCalls } = makeClient({ bookings: [] })
    await loadAccountBookings(client, CUSTOMER_ID)
    expect(orderCalls).toEqual([
      ['scheduled_date', { ascending: false }],
      ['created_at', { ascending: false }],
    ])
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

  it('maps database columns to the public camelCase shape', async () => {
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
      photos: [],
    })
  })

  it('looks photos up for completed bookings only', async () => {
    const { client, inCalls } = makeClient({
      bookings: [
        { id: 'paid-1', status: 'paid' },
        { id: 'done-1', status: 'completed' },
        { id: 'gone-1', status: 'cancelled' },
      ],
    })
    await loadAccountBookings(client, CUSTOMER_ID)
    expect(inCalls).toContainEqual(['photos.booking_id', ['done-1']])
  })

  it('does not query photos or sign anything without a completed booking', async () => {
    const { client, inCalls, signed } = makeClient({ bookings: [{ id: 'a', status: 'paid' }] })
    await loadAccountBookings(client, CUSTOMER_ID)
    expect(inCalls.some(([column]) => column.startsWith('photos'))).toBe(false)
    expect(signed).not.toHaveBeenCalled()
  })

  it('signs the photos for 600 seconds and attaches them to the completed booking', async () => {
    const { client, signed } = makeClient({
      bookings: [{ id: 'done-1', status: 'completed' }],
      photos: [
        { booking_id: 'done-1', kind: 'before', storage_path: 'done-1/before.jpg' },
        { booking_id: 'done-1', kind: 'after', storage_path: 'done-1/after.jpg' },
      ],
    })
    const [booking] = await loadAccountBookings(client, CUSTOMER_ID)
    expect(signed).toHaveBeenCalledWith(['done-1/before.jpg', 'done-1/after.jpg'], 600)
    expect(booking?.photos).toEqual([
      { kind: 'before', url: 'https://signed.test/done-1/before.jpg?t=1' },
      { kind: 'after', url: 'https://signed.test/done-1/after.jpg?t=1' },
    ])
  })

  it('keeps the booking without photos when signing fails', async () => {
    const { client } = makeClient({
      bookings: [{ id: 'done-1', status: 'completed' }],
      photos: [{ booking_id: 'done-1', kind: 'before', storage_path: 'done-1/before.jpg' }],
      signError: true,
    })
    const [booking] = await loadAccountBookings(client, CUSTOMER_ID)
    expect(booking?.photos).toEqual([])
  })

  it('keeps the bookings when the photo lookup fails', async () => {
    const { client } = makeClient({
      bookings: [{ id: 'done-1', status: 'completed' }],
      photosError: true,
    })
    const result = await loadAccountBookings(client, CUSTOMER_ID)
    expect(result).toHaveLength(1)
  })

  it('throws a 500 when the bookings query fails', async () => {
    const { client } = makeClient({ bookings: [], bookingsError: true })
    await expect(loadAccountBookings(client, CUSTOMER_ID)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
