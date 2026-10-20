import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ADDRESS_SEARCH_CACHE_TTL_MS } from '../../../app/constants/address'
import { searchAddresses, searchMunicipalities } from '../../../server/utils/addressSearch'

type HttpError = Error & { statusCode: number }

type FetchOptions = { query: Record<string, unknown> }

const franceFeature = (label: string) => ({
  geometry: { coordinates: [6.1685, 49.3595] },
  properties: { label, city: 'Thionville', postcode: '57100' },
})

const fetchMock = vi.fn()

const uniqueQuery = (): string => `rue ${crypto.randomUUID()}`

const failureOf = (call: Promise<unknown>): Promise<HttpError> =>
  call.then(
    () => {
      throw new Error('expected a rejection')
    },
    (error: HttpError) => error,
  )

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () => ({ features: [franceFeature('1 rue A')] }))
  vi.stubGlobal('$fetch', fetchMock)
  vi.stubGlobal('createError', (options: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(options.statusMessage), { statusCode: options.statusCode }),
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('searchAddresses', () => {
  it('calls the provider once for the same query typed with other case and spaces', async () => {
    const q = uniqueQuery()
    await searchAddresses(q, 'FR')
    await searchAddresses(`  ${q.toUpperCase().replace(' ', '   ')} `, 'FR')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends the normalised query to the provider', async () => {
    const q = uniqueQuery()
    await searchAddresses(`  ${q.toUpperCase().replace(' ', '   ')} `, 'FR')
    const options = fetchMock.mock.calls[0]?.[1] as FetchOptions
    expect(options.query.q).toBe(q)
  })

  it('calls the provider again for another country', async () => {
    const q = uniqueQuery()
    fetchMock.mockImplementation(async () => ({ features: [] }))
    await searchAddresses(q, 'FR')
    await searchAddresses(q, 'LU')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('calls the provider again for another kind', async () => {
    const q = uniqueQuery()
    fetchMock.mockImplementation(async () => ({ features: [] }))
    await searchAddresses(q, 'FR')
    await searchMunicipalities(q, 'FR')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('calls the provider again once the TTL is over', async () => {
    vi.useFakeTimers()
    const q = uniqueQuery()
    await searchAddresses(q, 'FR')
    vi.advanceTimersByTime(ADDRESS_SEARCH_CACHE_TTL_MS - 1)
    await searchAddresses(q, 'FR')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    await searchAddresses(q, 'FR')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('answers 502 when the provider fails and does not cache the failure', async () => {
    const q = uniqueQuery()
    fetchMock.mockRejectedValueOnce(new Error('boom'))
    expect((await failureOf(searchAddresses(q, 'FR'))).statusCode).toBe(502)
    await expect(searchAddresses(q, 'FR')).resolves.toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('is not changed for the next caller when a result array is mutated', async () => {
    const q = uniqueQuery()
    const first = await searchAddresses(q, 'FR')
    first.length = 0
    expect(await searchAddresses(q, 'FR')).toHaveLength(1)
  })

  it('is not changed for the next caller when a cached array is mutated', async () => {
    const q = uniqueQuery()
    await searchAddresses(q, 'FR')
    const cached = await searchAddresses(q, 'FR')
    cached.pop()
    expect(await searchAddresses(q, 'FR')).toHaveLength(1)
  })
})

describe('searchMunicipalities', () => {
  it('finds a Luxembourg commune without calling the provider', async () => {
    const results = await searchMunicipalities('Luxembourg', 'LU')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]?.countryCode).toBe('LU')
  })
})
