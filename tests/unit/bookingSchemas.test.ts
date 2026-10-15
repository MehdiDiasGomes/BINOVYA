import { describe, expect, it } from 'vitest'

import { bookingReleaseSchema, bookingRequestSchema } from '../../server/utils/bookingSchemas'

type BookingBody = { address: Record<string, unknown>; contact: Record<string, unknown> } & Record<
  string,
  unknown
>

const validBody = (): BookingBody => ({
  address: {
    label: '12 rue de la Gare, 57100 Thionville',
    city: 'Thionville',
    postcode: '57100',
    countryCode: 'FR',
    latitude: 49.36,
    longitude: 6.16,
  },
  plan: 'one_off',
  smallBinCount: 1,
  largeBinCount: 0,
  householdCollectionWeekdays: [],
  recyclingCollectionWeekdays: [],
  binsReadyConfirmed: true,
  date: '2026-11-17',
  contact: {
    firstName: 'Jeanne',
    lastName: 'Martin',
    email: 'jeanne@example.com',
    phone: '+33612345678',
  },
  website: '',
})

const without = (key: string): unknown =>
  Object.fromEntries(Object.entries(validBody()).filter(([name]) => name !== key))

const withOverride = (override: Record<string, unknown>): unknown => ({
  ...validBody(),
  ...override,
})

describe('bookingRequestSchema', () => {
  it('accepts a complete valid request', () => {
    expect(bookingRequestSchema.safeParse(validBody()).success).toBe(true)
  })

  it('defaults the locale to fr', () => {
    expect(bookingRequestSchema.parse(validBody()).locale).toBe('fr')
  })

  it('keeps an explicit en locale', () => {
    expect(bookingRequestSchema.parse(withOverride({ locale: 'en' })).locale).toBe('en')
  })

  it('rejects an unknown locale', () => {
    expect(bookingRequestSchema.safeParse(withOverride({ locale: 'de' })).success).toBe(false)
  })

  it.each(['2026-02-30', '2026-13-01', '2026-02-29', '17/11/2026', '', 'tomorrow'])(
    'rejects the date %s',
    date => {
      expect(bookingRequestSchema.safeParse(withOverride({ date })).success).toBe(false)
    },
  )

  it.each(['2028-02-29', '2026-12-31'])('accepts the real calendar date %s', date => {
    expect(bookingRequestSchema.safeParse(withOverride({ date })).success).toBe(true)
  })

  it('rejects a request whose bins are not confirmed', () => {
    expect(
      bookingRequestSchema.safeParse(withOverride({ binsReadyConfirmed: false })).success,
    ).toBe(false)
  })

  it('rejects a request without the bins confirmation', () => {
    expect(bookingRequestSchema.safeParse(without('binsReadyConfirmed')).success).toBe(false)
  })

  it('rejects a bins confirmation sent as a string', () => {
    expect(
      bookingRequestSchema.safeParse(withOverride({ binsReadyConfirmed: 'true' })).success,
    ).toBe(false)
  })

  it('rejects an unknown plan', () => {
    expect(bookingRequestSchema.safeParse(withOverride({ plan: 'monthly' })).success).toBe(false)
  })

  it.each(['one_off', 'quarterly', 'annual'])('accepts the plan %s', plan => {
    expect(bookingRequestSchema.safeParse(withOverride({ plan })).success).toBe(true)
  })

  it('accepts 0 and 10 bins', () => {
    expect(
      bookingRequestSchema.safeParse(withOverride({ smallBinCount: 0, largeBinCount: 10 })).success,
    ).toBe(true)
  })

  it.each([-1, 11, 1.5])('rejects %s small bins', smallBinCount => {
    expect(bookingRequestSchema.safeParse(withOverride({ smallBinCount })).success).toBe(false)
  })

  it('rejects a weekday above 6', () => {
    expect(
      bookingRequestSchema.safeParse(withOverride({ householdCollectionWeekdays: [7] })).success,
    ).toBe(false)
  })

  it('rejects a honeypot longer than 200 characters', () => {
    expect(bookingRequestSchema.safeParse(withOverride({ website: 'x'.repeat(201) })).success).toBe(
      false,
    )
  })

  it('accepts a filled honeypot of 200 characters', () => {
    expect(bookingRequestSchema.safeParse(withOverride({ website: 'x'.repeat(200) })).success).toBe(
      true,
    )
  })

  it('rejects a request without honeypot field', () => {
    expect(bookingRequestSchema.safeParse(without('website')).success).toBe(false)
  })

  it('rejects an invalid contact email', () => {
    const body = validBody()
    expect(
      bookingRequestSchema.safeParse({ ...body, contact: { ...body.contact, email: 'nope' } })
        .success,
    ).toBe(false)
  })

  describe('address postcode', () => {
    const withAddress = (countryCode: string, postcode: string): unknown => ({
      ...validBody(),
      address: { ...validBody().address, countryCode, postcode },
    })

    it('accepts a 5-digit French postcode', () => {
      expect(bookingRequestSchema.safeParse(withAddress('FR', '57100')).success).toBe(true)
    })

    it('accepts a 4-digit Luxembourg postcode', () => {
      expect(bookingRequestSchema.safeParse(withAddress('LU', '1855')).success).toBe(true)
    })

    it.each(['5710', '571000', '5710A', ''])('rejects the French postcode "%s"', postcode => {
      expect(bookingRequestSchema.safeParse(withAddress('FR', postcode)).success).toBe(false)
    })

    it.each(['18555', '185', 'L-1855'])('rejects the Luxembourg postcode "%s"', postcode => {
      expect(bookingRequestSchema.safeParse(withAddress('LU', postcode)).success).toBe(false)
    })

    it('rejects a country other than FR or LU', () => {
      expect(bookingRequestSchema.safeParse(withAddress('BE', '1000')).success).toBe(false)
    })
  })

  describe('address coordinates', () => {
    it('rejects a latitude above 90', () => {
      const body = validBody()
      expect(
        bookingRequestSchema.safeParse({ ...body, address: { ...body.address, latitude: 91 } })
          .success,
      ).toBe(false)
    })

    it('rejects a longitude below -180', () => {
      const body = validBody()
      expect(
        bookingRequestSchema.safeParse({ ...body, address: { ...body.address, longitude: -181 } })
          .success,
      ).toBe(false)
    })
  })
})

describe('bookingReleaseSchema', () => {
  it('accepts a uuid', () => {
    expect(
      bookingReleaseSchema.safeParse({ bookingId: '3f2b8c1e-5d4a-4c7e-9b1a-2e6f8d0a1c3b' }).success,
    ).toBe(true)
  })

  it.each(['', 'abc', '123', '3f2b8c1e-5d4a-4c7e-9b1a'])('rejects "%s"', bookingId => {
    expect(bookingReleaseSchema.safeParse({ bookingId }).success).toBe(false)
  })

  it('rejects a missing booking id', () => {
    expect(bookingReleaseSchema.safeParse({}).success).toBe(false)
  })
})
