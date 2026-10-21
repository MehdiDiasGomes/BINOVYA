import { afterEach, describe, expect, it, vi } from 'vitest'

import { searchMunicipalities } from '../../../server/utils/addressSearch'
import {
  ADDRESS_TOKEN_TTL_SECONDS,
  signAddressToken,
  signMunicipalityToken,
  verifyAddressToken,
  verifyMunicipalityToken,
  requireSignedMunicipality,
} from '../../../server/utils/addressToken'
import { LUXEMBOURG_COMMUNES } from '../../../server/utils/luxembourgCommunes'
import { LUXEMBOURG_COMMUNE, THIONVILLE_ADDRESS, THIONVILLE_COMMUNE } from '../../support/address'

import type { AddressDetails, BookingAddress } from '../../../app/types/booking'

const SECRET = 'unit-test-secret-of-at-least-32-characters'
const NOW = Date.parse('2026-10-16T10:00:00Z')

afterEach(() => {
  vi.unstubAllGlobals()
})

const signedCommune = (commune: AddressDetails = THIONVILLE_COMMUNE): BookingAddress => ({
  ...commune,
  token: signMunicipalityToken(commune, SECRET, NOW),
})

describe('signMunicipalityToken and verifyMunicipalityToken', () => {
  it('accepts a municipality token for the fields it signed', () => {
    expect(verifyMunicipalityToken(signedCommune(), SECRET, NOW)).toBe(true)
  })

  it('has the same <expiry>.<mac> format as an address token', () => {
    const token = signMunicipalityToken(THIONVILLE_COMMUNE, SECRET, NOW)
    const [expiry, mac] = token.split('.')
    expect(Number(expiry)).toBe(Math.floor(NOW / 1000) + ADDRESS_TOKEN_TTL_SECONDS)
    expect(mac).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('refuses an expired token and accepts it just before its expiry', () => {
    const commune = signedCommune()
    const expiresAt = Number(commune.token.split('.')[0]) * 1000
    expect(verifyMunicipalityToken(commune, SECRET, expiresAt - 1)).toBe(true)
    expect(verifyMunicipalityToken(commune, SECRET, expiresAt)).toBe(false)
  })

  it('refuses a token signed with another secret', () => {
    expect(verifyMunicipalityToken(signedCommune(), 'x'.repeat(40), NOW)).toBe(false)
  })

  it.each([
    ['label', { label: 'Metz (57000)' }],
    ['city', { city: 'Metz' }],
    ['postcode', { postcode: '57000' }],
    ['country', { countryCode: 'LU' as const }],
    ['latitude', { latitude: 49.1193 }],
    ['longitude', { longitude: 6.1757 }],
  ])('refuses a municipality whose %s was altered', (_name, patch) => {
    expect(verifyMunicipalityToken({ ...signedCommune(), ...patch }, SECRET, NOW)).toBe(false)
  })

  it('refuses a missing or malformed token', () => {
    expect(verifyMunicipalityToken({ ...THIONVILLE_COMMUNE, token: '' }, SECRET, NOW)).toBe(false)
    expect(verifyMunicipalityToken({ ...THIONVILLE_COMMUNE, token: 'abc' }, SECRET, NOW)).toBe(
      false,
    )
  })
})

describe('address and municipality contexts', () => {
  it('refuses an address token where a municipality is expected', () => {
    const addressToken = signAddressToken(THIONVILLE_COMMUNE, SECRET, NOW)
    expect(
      verifyMunicipalityToken({ ...THIONVILLE_COMMUNE, token: addressToken }, SECRET, NOW),
    ).toBe(false)
  })

  it('refuses a municipality token where an address is expected', () => {
    const communeToken = signMunicipalityToken(THIONVILLE_ADDRESS, SECRET, NOW)
    expect(verifyAddressToken({ ...THIONVILLE_ADDRESS, token: communeToken }, SECRET, NOW)).toBe(
      false,
    )
  })

  it('produces different tokens for the same fields in each context', () => {
    expect(signAddressToken(THIONVILLE_COMMUNE, SECRET, NOW)).not.toBe(
      signMunicipalityToken(THIONVILLE_COMMUNE, SECRET, NOW),
    )
  })

  it('accepts a Luxembourg commune with an empty postcode', () => {
    expect(verifyMunicipalityToken(signedCommune(LUXEMBOURG_COMMUNE), SECRET, NOW)).toBe(true)
  })
})

describe('requireSignedMunicipality', () => {
  const stubRuntime = (): void => {
    vi.stubGlobal('useRuntimeConfig', () => ({ addressTokenSecret: SECRET }))
    vi.stubGlobal('createError', (options: { statusCode: number; data?: unknown }) =>
      Object.assign(new Error('http'), options),
    )
  }

  it('accepts a municipality signed by the municipality search', () => {
    stubRuntime()
    const fresh: BookingAddress = {
      ...THIONVILLE_COMMUNE,
      token: signMunicipalityToken(THIONVILLE_COMMUNE, SECRET),
    }
    expect(() => requireSignedMunicipality(fresh)).not.toThrow()
  })

  it('rejects an address token with 400 and the invalidAddress code', () => {
    stubRuntime()
    const token = signAddressToken(THIONVILLE_COMMUNE, SECRET)
    let thrown: unknown
    try {
      requireSignedMunicipality({ ...THIONVILLE_COMMUNE, token })
    } catch (error) {
      thrown = error
    }
    expect(thrown).toMatchObject({ statusCode: 400, data: { code: 'invalidAddress' } })
  })
})

describe('searchMunicipalities for Luxembourg', () => {
  it('lists the 27 communes without any network call', async () => {
    expect(LUXEMBOURG_COMMUNES).toHaveLength(27)
    const fetchSpy = vi.fn()
    vi.stubGlobal('$fetch', fetchSpy)
    const results = await searchMunicipalities('e', 'LU')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(results.length).toBeLessThanOrEqual(5)
  })

  it('labels a commune « <name> (LU) » with an empty postcode and its centre', async () => {
    const [first] = await searchMunicipalities('Luxembourg', 'LU')
    expect(first).toEqual(LUXEMBOURG_COMMUNE)
  })

  it('matches regardless of accents and case', async () => {
    const results = await searchMunicipalities('PETANGE', 'LU')
    expect(results.map(result => result.city)).toEqual(['Pétange'])
  })

  it('treats hyphens and spaces alike', async () => {
    const results = await searchMunicipalities('esch sur', 'LU')
    expect(results.map(result => result.city)).toEqual(['Esch-sur-Alzette'])
  })

  it('ranks a name starting with the query before one that only contains it', async () => {
    const results = await searchMunicipalities('sa', 'LU')
    expect(results.map(result => result.city).slice(0, 2)).toEqual(['Sandweiler', 'Sanem'])
  })

  it('returns at most five suggestions, sorted by name inside a rank', async () => {
    const results = await searchMunicipalities('e', 'LU')
    expect(results).toHaveLength(5)
  })

  it('returns nothing for an unknown commune', async () => {
    expect(await searchMunicipalities('Atlantis', 'LU')).toEqual([])
  })

  it('only offers communes of the fixed list', async () => {
    const names = new Set(LUXEMBOURG_COMMUNES.map(commune => commune.name))
    const results = await searchMunicipalities('a', 'LU')
    results.forEach(result => expect(names.has(result.city)).toBe(true))
  })
})
