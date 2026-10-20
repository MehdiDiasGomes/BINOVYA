import { describe, expect, it } from 'vitest'

import { getApi } from '../../support/api'

import type { AddressSearchResponse } from '../../../app/types/booking'

const search = async (query: string, kind: string): Promise<AddressSearchResponse> => {
  const result = await getApi(
    `/api/address/search?q=${encodeURIComponent(query)}&country=LU&kind=${kind}`,
  )
  expect(result.status).toBe(200)
  return result.body as unknown as AddressSearchResponse
}

describe('GET /api/address/search cache', () => {
  it('answers the same suggestions whatever the case and the spaces of the query', async () => {
    const first = await search('petange', 'municipality')
    const second = await search('  PETANGE ', 'municipality')
    expect(second.suggestions.map(entry => entry.label)).toEqual(
      first.suggestions.map(entry => entry.label),
    )
    expect(first.suggestions.length).toBeGreaterThan(0)
  })

  it('keeps the kinds apart: a municipality query never answers addresses', async () => {
    const municipalities = await search('Esch', 'municipality')
    expect(municipalities.suggestions.map(entry => entry.label)).toEqual(['Esch-sur-Alzette (LU)'])
  })

  it('answers the same signed suggestions for the same normalised query', async () => {
    const first = await search('Luxembourg', 'municipality')
    const second = await search('luxembourg', 'municipality')
    expect(second.suggestions[0]?.token).toBe(first.suggestions[0]?.token)
  })
})
