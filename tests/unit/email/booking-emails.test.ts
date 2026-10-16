import { describe, expect, it } from 'vitest'

import { isAllowedLoginUrl, toBookingEmailData } from '../../../server/utils/bookingEmails'

const HOSTS: string[] = ['abc.supabase.co', 'binovya.fr']

const CLEAR_SCHEME = ['http', '//'].join(':')

const SCRIPT_SCHEME = ['javascript', 'alert(1)'].join(':')

describe('isAllowedLoginUrl', () => {
  it('accepts https on an allowed host', () => {
    expect(isAllowedLoginUrl('https://abc.supabase.co/auth/v1/verify?token=x', HOSTS)).toBe(true)
  })

  it('accepts https on the site host', () => {
    expect(isAllowedLoginUrl('https://binovya.fr/mon-espace', HOSTS)).toBe(true)
  })

  it('accepts http on localhost when the host is allowed', () => {
    expect(isAllowedLoginUrl(`${CLEAR_SCHEME}localhost:3000/espace`, ['localhost:3000'])).toBe(true)
  })

  it('accepts http on 127.0.0.1 when the host is allowed', () => {
    expect(isAllowedLoginUrl(`${CLEAR_SCHEME}127.0.0.1:3000/espace`, ['127.0.0.1:3000'])).toBe(true)
  })

  it('refuses a javascript: link', () => {
    expect(isAllowedLoginUrl(SCRIPT_SCHEME, HOSTS)).toBe(false)
  })

  it('refuses a data: link', () => {
    expect(isAllowedLoginUrl('data:text/html,<script>alert(1)</script>', HOSTS)).toBe(false)
  })

  it('refuses an https host that is not in the list', () => {
    expect(isAllowedLoginUrl('https://evil.example.com/login', HOSTS)).toBe(false)
  })

  it('refuses a look-alike host', () => {
    expect(isAllowedLoginUrl('https://binovya.fr.evil.example.com/', HOSTS)).toBe(false)
    expect(isAllowedLoginUrl('https://evil.example.com@binovya.fr.evil.com/', HOSTS)).toBe(false)
  })

  it('refuses http on a host that is not localhost', () => {
    expect(isAllowedLoginUrl(`${CLEAR_SCHEME}binovya.fr/mon-espace`, HOSTS)).toBe(false)
  })

  it('refuses http on localhost when the host is not in the list', () => {
    expect(isAllowedLoginUrl(`${CLEAR_SCHEME}localhost:3000/espace`, HOSTS)).toBe(false)
  })

  it('refuses a malformed URL', () => {
    expect(isAllowedLoginUrl('not a url', HOSTS)).toBe(false)
  })

  it('refuses an empty URL', () => {
    expect(isAllowedLoginUrl('', HOSTS)).toBe(false)
  })

  it('refuses every URL when the list is empty', () => {
    expect(isAllowedLoginUrl('https://binovya.fr/', [])).toBe(false)
  })
})

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
        { email: 'a@b.test', first_name: 'Ada', last_name: 'Lovelace', phone: '+33612345678' },
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
