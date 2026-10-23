import { describe, expect, it, vi } from 'vitest'

import { loadBookingEmailData, toBookingEmailData } from '../../../server/utils/bookingEmails'
import { asClient } from '../../support/pro-fixtures'

describe('toBookingEmailData', () => {
  it('merges a booking row and its customer profile', () => {
    expect(
      toBookingEmailData(
        {
          id: 'b1',
          customer_id: 'c1',
          scheduled_date: '2026-10-19',
          address: '12 rue de la Gare, 57100 Thionville',
          plan: 'one_off',
          small_bin_count: 1,
          large_bin_count: 2,
          amount_total_cents: 1990,
        },
        {
          id: 'c1',
          email: 'a@b.test',
          first_name: 'Ada',
          last_name: 'Lovelace',
          phone: '+33612345678',
        },
      ),
    ).toEqual({
      id: 'b1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'a@b.test',
      phone: '+33612345678',
      scheduledDate: '2026-10-19',
      address: '12 rue de la Gare, 57100 Thionville',
      plan: 'one_off',
      smallBinCount: 1,
      largeBinCount: 2,
      amountTotalCents: 1990,
    })
  })
})

describe('loadBookingEmailData', () => {
  const BOOKING_ID = '11111111-2222-3333-4444-555555555555'

  const queryAnswering = (answer: unknown): { select: () => unknown } => {
    const query = { maybeSingle: vi.fn().mockResolvedValue(answer) }
    const filtered = { eq: vi.fn().mockReturnValue(query) }
    return { select: vi.fn().mockReturnValue(filtered) }
  }

  const clientAnswering = (booking: unknown, customer: unknown): ReturnType<typeof asClient> => {
    const tables: Record<string, unknown> = {
      bookings: queryAnswering(booking),
      profiles: queryAnswering(customer),
    }
    return asClient({ from: vi.fn((table: string) => tables[table] ?? tables.bookings) })
  }

  it('returns null and logs the booking id only when the booking read fails', async () => {
    const logger = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const client = clientAnswering(
      { data: null, error: { message: 'secret db detail' } },
      { data: null, error: null },
    )
    expect(await loadBookingEmailData(client, BOOKING_ID)).toBeNull()
    const logged = logger.mock.calls.flat().join(' ')
    expect(logged).toContain(`Booking emails skipped: booking ${BOOKING_ID} could not be read`)
    expect(logged).not.toContain('secret db detail')
    logger.mockRestore()
  })

  it('returns null and logs a read error when the customer read fails', async () => {
    const logger = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const client = clientAnswering(
      { data: { id: BOOKING_ID, customer_id: 'c1' }, error: null },
      { data: null, error: { message: 'boom' } },
    )
    expect(await loadBookingEmailData(client, BOOKING_ID)).toBeNull()
    expect(logger.mock.calls.flat().join(' ')).toContain('could not be read')
    logger.mockRestore()
  })

  it('logs not found, not a read error, when the booking does not exist', async () => {
    const logger = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const client = clientAnswering({ data: null, error: null }, { data: null, error: null })
    expect(await loadBookingEmailData(client, BOOKING_ID)).toBeNull()
    expect(logger.mock.calls.flat().join(' ')).toContain('or its customer was not found')
    logger.mockRestore()
  })
})
