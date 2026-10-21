import { describe, expect, it } from 'vitest'

import { ADDRESS_SEARCH_MIN_LENGTH } from '../../../app/constants/address'
import { verifyAddressToken, verifyMunicipalityToken } from '../../../server/utils/addressToken'
import { getApi } from '../../support/api'
import { readEnv } from '../../support/env'

import type { AddressSearchResponse } from '../../../app/types/booking'

const SECRET = readEnv('NUXT_ADDRESS_TOKEN_SECRET')

const searchLuxembourg = async (query: string): Promise<AddressSearchResponse> => {
  const result = await getApi(
    `/api/address/search?q=${encodeURIComponent(query)}&country=LU&kind=municipality`,
  )
  expect(result.status).toBe(200)
  return result.body as unknown as AddressSearchResponse
}

describe('GET /api/address/search?kind=municipality for Luxembourg', () => {
  it('answers from the fixed list of communes, labelled with (LU) and an empty postcode', async () => {
    const { suggestions } = await searchLuxembourg('Esch')
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      label: 'Esch-sur-Alzette (LU)',
      city: 'Esch-sur-Alzette',
      postcode: '',
      countryCode: 'LU',
    })
  })

  it('matches without accents or case and returns at most five suggestions', async () => {
    expect((await searchLuxembourg('PETANGE')).suggestions.map(entry => entry.city)).toEqual([
      'Pétange',
    ])
    expect((await searchLuxembourg('ang')).suggestions.length).toBeLessThanOrEqual(5)
  })

  it('returns no suggestion for an unknown commune', async () => {
    expect((await searchLuxembourg('Atlantis')).suggestions).toEqual([])
  })

  it('signs each suggestion as a municipality, never as an address', async () => {
    const { suggestions } = await searchLuxembourg('Luxembourg')
    expect(suggestions.length).toBeGreaterThan(0)
    suggestions.forEach(suggestion => {
      expect(verifyMunicipalityToken(suggestion, SECRET)).toBe(true)
      expect(verifyAddressToken(suggestion, SECRET)).toBe(false)
    })
  })

  it.each([
    [
      'a query shorter than the minimum',
      `q=${'a'.repeat(ADDRESS_SEARCH_MIN_LENGTH - 1)}&country=LU`,
    ],
    ['an unknown country', 'q=Luxembourg&country=BE&kind=municipality'],
    ['an unknown kind', 'q=Luxembourg&country=LU&kind=street'],
    ['no country', 'q=Luxembourg&kind=municipality'],
  ])('answers 400 to %s', async (_name, query) => {
    expect((await getApi(`/api/address/search?${query}`)).status).toBe(400)
  })
})
