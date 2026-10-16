import { FetchError } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { isInvalidAddressError, readFetchErrorCode } from '../../../app/utils/fetchError'
import {
  ADDRESS_TOKEN_MAX_LENGTH,
  ADDRESS_TOKEN_SECRET_MIN_LENGTH,
  ADDRESS_TOKEN_TTL_SECONDS,
  requireSignedAddress,
  signAddressToken,
  verifyAddressToken,
} from '../../../server/utils/addressToken'
import { addressDetailsSchema } from '../../../server/utils/bookingSchemas'
import { THIONVILLE_ADDRESS } from '../../support/address'

import type { AddressDetails, BookingAddress } from '../../../app/types/booking'

const SECRET: string = 'unit-test-secret-of-at-least-32-characters'
const OTHER_SECRET: string = 'another-unit-test-secret-32-characters!'
const NOW: number = Date.parse('2026-10-16T10:00:00Z')

const signed = (
  address: AddressDetails = THIONVILLE_ADDRESS,
  now: number = NOW,
): BookingAddress => ({
  ...address,
  token: signAddressToken(address, SECRET, now),
})

const expiryOf = (address: BookingAddress): number => Number(address.token.split('.')[0])

const httpError = (data: unknown): FetchError =>
  Object.assign(new FetchError('request failed'), { data })

describe('constants', () => {
  it('keeps a token valid for 24 hours, a 32 character secret and 128 character tokens', () => {
    expect(ADDRESS_TOKEN_TTL_SECONDS).toBe(86_400)
    expect(ADDRESS_TOKEN_SECRET_MIN_LENGTH).toBe(32)
    expect(ADDRESS_TOKEN_MAX_LENGTH).toBe(128)
  })
})

describe('signAddressToken', () => {
  it('builds <expiresAt>.<mac> with the expiry 24 hours after now, in seconds', () => {
    const token: string = signAddressToken(THIONVILLE_ADDRESS, SECRET, NOW)
    expect(token).toMatch(/^\d+\.[A-Za-z0-9_-]+$/)
    expect(Number(token.split('.')[0])).toBe(NOW / 1000 + ADDRESS_TOKEN_TTL_SECONDS)
  })

  it('stays within the maximum token length', () => {
    expect(signed().token.length).toBeLessThanOrEqual(ADDRESS_TOKEN_MAX_LENGTH)
  })

  it('is deterministic for the same address, secret and time', () => {
    expect(signAddressToken(THIONVILLE_ADDRESS, SECRET, NOW)).toBe(
      signAddressToken(THIONVILLE_ADDRESS, SECRET, NOW),
    )
  })
})

describe('verifyAddressToken', () => {
  it('accepts an address with the token issued for it', () => {
    expect(verifyAddressToken(signed(), SECRET, NOW)).toBe(true)
  })

  it.each<[string, Partial<AddressDetails>]>([
    ['label', { label: '14 rue de la Gare, 57100 Thionville' }],
    ['city', { city: 'Yutz' }],
    ['postcode', { postcode: '57970' }],
    ['countryCode', { countryCode: 'LU' }],
    ['latitude', { latitude: 49.36 }],
    ['longitude', { longitude: 6.17 }],
  ])('rejects an address whose %s was changed', (_field, change) => {
    expect(verifyAddressToken({ ...signed(), ...change }, SECRET, NOW)).toBe(false)
  })

  it('rejects a token signed with another secret', () => {
    expect(verifyAddressToken(signed(), OTHER_SECRET, NOW)).toBe(false)
  })

  it('accepts a token up to the last second before expiry', () => {
    const address: BookingAddress = signed()
    expect(verifyAddressToken(address, SECRET, expiryOf(address) * 1000 - 1)).toBe(true)
  })

  it('rejects a token at the exact expiry instant', () => {
    const address: BookingAddress = signed()
    expect(verifyAddressToken(address, SECRET, expiryOf(address) * 1000)).toBe(false)
  })

  it('rejects an expired token', () => {
    const address: BookingAddress = signed()
    expect(verifyAddressToken(address, SECRET, expiryOf(address) * 1000 + 1)).toBe(false)
  })

  it('rejects a token whose expiry was extended without re-signing', () => {
    const address: BookingAddress = signed()
    const mac: string = address.token.split('.')[1] ?? ''
    expect(
      verifyAddressToken({ ...address, token: `${expiryOf(address) + 3600}.${mac}` }, SECRET, NOW),
    ).toBe(false)
  })

  it('rejects an empty token', () => {
    expect(verifyAddressToken({ ...THIONVILLE_ADDRESS, token: '' }, SECRET, NOW)).toBe(false)
  })

  it('rejects a token without a dot', () => {
    expect(verifyAddressToken({ ...THIONVILLE_ADDRESS, token: 'abcdef' }, SECRET, NOW)).toBe(false)
  })

  it('rejects a token with a non numeric expiry', () => {
    const mac: string = signed().token.split('.')[1] ?? ''
    expect(verifyAddressToken({ ...THIONVILLE_ADDRESS, token: `soon.${mac}` }, SECRET, NOW)).toBe(
      false,
    )
  })

  it('rejects a truncated mac', () => {
    const address: BookingAddress = signed()
    expect(verifyAddressToken({ ...address, token: address.token.slice(0, -4) }, SECRET, NOW)).toBe(
      false,
    )
  })

  it('rejects a mac longer than the expected one', () => {
    const address: BookingAddress = signed()
    expect(verifyAddressToken({ ...address, token: `${address.token}AAAA` }, SECRET, NOW)).toBe(
      false,
    )
  })

  it('rejects an empty mac', () => {
    const address: BookingAddress = signed()
    expect(verifyAddressToken({ ...address, token: `${expiryOf(address)}.` }, SECRET, NOW)).toBe(
      false,
    )
  })

  it.each(['12 rue | de "la" Gare, 57100 Thionville', 'Rue A,B|C", 57100 Thionville'])(
    'round-trips a label containing |, a quote or a comma (%s)',
    label => {
      const address: AddressDetails = { ...THIONVILLE_ADDRESS, label }
      expect(verifyAddressToken(signed(address), SECRET, NOW)).toBe(true)
      expect(verifyAddressToken({ ...signed(address), label: `${label}x` }, SECRET, NOW)).toBe(
        false,
      )
    },
  )

  it('accepts a label or city with surrounding spaces, since the server trims them', () => {
    const padded: BookingAddress = {
      ...signed(),
      label: `  ${THIONVILLE_ADDRESS.label}  `,
      city: ` ${THIONVILLE_ADDRESS.city} `,
    }
    expect(verifyAddressToken(padded, SECRET, NOW)).toBe(true)
  })
})

describe('requireSignedAddress', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const stubNitro = (secret: string): void => {
    vi.stubGlobal('useRuntimeConfig', () => ({ addressTokenSecret: secret }))
    vi.stubGlobal('createError', (input: object) => Object.assign(new Error('http'), input))
  }

  it('lets a valid address through', () => {
    stubNitro(SECRET)
    expect(() => requireSignedAddress(signed(THIONVILLE_ADDRESS, Date.now()))).not.toThrow()
  })

  it('throws 400 with the code invalidAddress for a tampered address', () => {
    stubNitro(SECRET)
    expect(() =>
      requireSignedAddress({ ...signed(THIONVILLE_ADDRESS, Date.now()), latitude: 48.86 }),
    ).toThrowError(expect.objectContaining({ statusCode: 400, data: { code: 'invalidAddress' } }))
  })

  it('throws 500 when the secret is shorter than 32 characters', () => {
    stubNitro('short')
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => requireSignedAddress(signed())).toThrowError(
      expect.objectContaining({ statusCode: 500 }),
    )
  })
})

describe('addressDetailsSchema', () => {
  it('accepts a complete suggestion', () => {
    expect(addressDetailsSchema.safeParse(THIONVILLE_ADDRESS).success).toBe(true)
  })

  it('drops a suggestion without city', () => {
    expect(addressDetailsSchema.safeParse({ ...THIONVILLE_ADDRESS, city: '' }).success).toBe(false)
  })

  it('drops a suggestion without postcode', () => {
    expect(addressDetailsSchema.safeParse({ ...THIONVILLE_ADDRESS, postcode: '' }).success).toBe(
      false,
    )
  })

  it('drops a French suggestion with a Luxembourg postcode', () => {
    expect(
      addressDetailsSchema.safeParse({ ...THIONVILLE_ADDRESS, postcode: '1234' }).success,
    ).toBe(false)
  })
})

describe('readFetchErrorCode', () => {
  it('reads data.code of a fetch error response', () => {
    expect(readFetchErrorCode(httpError({ data: { code: 'outOfArea' } }))).toBe('outOfArea')
  })

  it('returns undefined for a fetch error without code', () => {
    expect(readFetchErrorCode(httpError({ statusMessage: 'x' }))).toBeUndefined()
    expect(readFetchErrorCode(httpError(undefined))).toBeUndefined()
  })

  it('returns undefined for an error that is not a fetch error', () => {
    expect(readFetchErrorCode(new Error('x'))).toBeUndefined()
    expect(readFetchErrorCode(null)).toBeUndefined()
    expect(readFetchErrorCode({ data: { data: { code: 'invalidAddress' } } })).toBeUndefined()
  })
})

describe('isInvalidAddressError', () => {
  it('is true for the code invalidAddress', () => {
    expect(isInvalidAddressError(httpError({ data: { code: 'invalidAddress' } }))).toBe(true)
  })

  it('is false for another code and for a plain error', () => {
    expect(isInvalidAddressError(httpError({ data: { code: 'outOfArea' } }))).toBe(false)
    expect(isInvalidAddressError(new Error('x'))).toBe(false)
  })
})
