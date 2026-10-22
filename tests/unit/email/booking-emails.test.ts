import { describe, expect, it } from 'vitest'

import { toBookingEmailData } from '../../../server/utils/bookingEmails'

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
