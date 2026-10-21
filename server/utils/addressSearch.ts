import { LUXEMBOURG_COMMUNES } from './luxembourgCommunes'
import { createMemoryCache, type MemoryCache } from './memoryCache'

import type { AddressDetails, AddressKind, CountryCode, LuxembourgCommune } from '@/types/booking'

import { ADDRESS_SEARCH_CACHE_MAX_ENTRIES, ADDRESS_SEARCH_CACHE_TTL_MS } from '@/constants/address'

type FranceFeature = {
  geometry: { coordinates: [number, number] }
  properties: { label: string; city: string; postcode: string }
}

type FranceMunicipalityFeature = {
  geometry: { coordinates: [number, number] }
  properties: { name: string; postcode: string }
}

type LuxembourgFeature = {
  geometry: { coordinates: [number, number] }
  properties: { label: string }
}

type FeatureCollection<Feature> = { features: Feature[] }

type CommuneMatch = { commune: LuxembourgCommune; rank: number }

const FRANCE_ENDPOINT = 'https://data.geopf.fr/geocodage/search'
const LUXEMBOURG_ENDPOINT = 'https://apiv4.geoportail.lu/fulltextsearch'
const FRANCE_MUNICIPALITY_TYPE: string = 'municipality'
const SEARCH_ORIGIN = { latitude: 49.306789, longitude: 6.149675 }
const LUXEMBOURG_EXTENT = '5.85,49.40,6.45,49.60'
const LUXEMBOURG_POSTCODE_MARKER = ', L-'
const LUXEMBOURG_POSTCODE_PATTERN = /^\d{4}$/
const LUXEMBOURG_MUNICIPALITY_SUFFIX: string = 'LU'
const SUGGESTION_LIMIT = 5
const REQUEST_TIMEOUT_MS = 5000

const franceQuery = (query: string): Record<string, string | number> => ({
  q: query,
  autocomplete: 1,
  limit: SUGGESTION_LIMIT,
  lat: SEARCH_ORIGIN.latitude,
  lon: SEARCH_ORIGIN.longitude,
})

const searchFrance = async (query: string): Promise<AddressDetails[]> => {
  const response: FeatureCollection<FranceFeature> = await $fetch<FeatureCollection<FranceFeature>>(
    FRANCE_ENDPOINT,
    {
      query: franceQuery(query),
      timeout: REQUEST_TIMEOUT_MS,
    },
  )
  return response.features.map(feature => ({
    label: feature.properties.label,
    city: feature.properties.city,
    postcode: feature.properties.postcode,
    countryCode: 'FR',
    longitude: feature.geometry.coordinates[0],
    latitude: feature.geometry.coordinates[1],
  }))
}

const searchFranceMunicipalities = async (query: string): Promise<AddressDetails[]> => {
  const response: FeatureCollection<FranceMunicipalityFeature> = await $fetch<
    FeatureCollection<FranceMunicipalityFeature>
  >(FRANCE_ENDPOINT, {
    query: { ...franceQuery(query), type: FRANCE_MUNICIPALITY_TYPE },
    timeout: REQUEST_TIMEOUT_MS,
  })
  return response.features.map(feature => ({
    label: `${feature.properties.name} (${feature.properties.postcode})`,
    city: feature.properties.name,
    postcode: feature.properties.postcode,
    countryCode: 'FR',
    longitude: feature.geometry.coordinates[0],
    latitude: feature.geometry.coordinates[1],
  }))
}

const toLuxembourgAddress = (feature: LuxembourgFeature): AddressDetails | null => {
  const { label } = feature.properties
  const markerIndex: number = label.lastIndexOf(LUXEMBOURG_POSTCODE_MARKER)
  if (markerIndex < 0) {
    return null
  }
  const [postcode = '', ...cityWords] = label
    .slice(markerIndex + LUXEMBOURG_POSTCODE_MARKER.length)
    .split(' ')
  const city: string = cityWords.join(' ').trim()
  if (!LUXEMBOURG_POSTCODE_PATTERN.test(postcode) || !city) {
    return null
  }
  return {
    label,
    city,
    postcode,
    countryCode: 'LU',
    longitude: feature.geometry.coordinates[0],
    latitude: feature.geometry.coordinates[1],
  }
}

const searchLuxembourg = async (query: string): Promise<AddressDetails[]> => {
  const response: FeatureCollection<LuxembourgFeature> = await $fetch<
    FeatureCollection<LuxembourgFeature>
  >(LUXEMBOURG_ENDPOINT, {
    query: { query, limit: SUGGESTION_LIMIT, layer: 'Adresse', extent: LUXEMBOURG_EXTENT },
    timeout: REQUEST_TIMEOUT_MS,
  })
  return response.features
    .map(toLuxembourgAddress)
    .filter((address): address is AddressDetails => address !== null)
}

const normalizeName = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[-'’\s]+/g, ' ')
    .trim()
    .toLowerCase()

const communeRank = (name: string, query: string): number => {
  if (name.startsWith(query)) {
    return 0
  }
  if (name.includes(` ${query}`)) {
    return 1
  }
  return name.includes(query) ? 2 : -1
}

const toLuxembourgMunicipality = (commune: LuxembourgCommune): AddressDetails => ({
  label: `${commune.name} (${LUXEMBOURG_MUNICIPALITY_SUFFIX})`,
  city: commune.name,
  postcode: '',
  countryCode: 'LU',
  latitude: commune.latitude,
  longitude: commune.longitude,
})

const searchLuxembourgMunicipalities = async (query: string): Promise<AddressDetails[]> => {
  const normalizedQuery: string = normalizeName(query)
  return LUXEMBOURG_COMMUNES.map(
    (commune): CommuneMatch => ({
      commune,
      rank: communeRank(normalizeName(commune.name), normalizedQuery),
    }),
  )
    .filter(match => match.rank >= 0)
    .sort(
      (first, second) =>
        first.rank - second.rank || first.commune.name.localeCompare(second.commune.name, 'fr'),
    )
    .slice(0, SUGGESTION_LIMIT)
    .map(match => toLuxembourgMunicipality(match.commune))
}

type CountrySearch = (query: string) => Promise<AddressDetails[]>

const SEARCH_BY_KIND_AND_COUNTRY: Record<AddressKind, Record<CountryCode, CountrySearch>> = {
  address: { FR: searchFrance, LU: searchLuxembourg },
  municipality: { FR: searchFranceMunicipalities, LU: searchLuxembourgMunicipalities },
}

const searchCache: MemoryCache<AddressDetails[]> = createMemoryCache<AddressDetails[]>(
  ADDRESS_SEARCH_CACHE_MAX_ENTRIES,
)

const normalizeQuery = (query: string): string => query.trim().replace(/\s+/g, ' ').toLowerCase()

const cachedSearch = async (
  kind: AddressKind,
  query: string,
  countryCode: CountryCode,
): Promise<AddressDetails[]> => {
  const normalizedQuery: string = normalizeQuery(query)
  const key: string = JSON.stringify([kind, countryCode, normalizedQuery])
  const cached: AddressDetails[] | undefined = searchCache.read(key, Date.now())
  if (cached) {
    return [...cached]
  }
  const results: AddressDetails[] =
    await SEARCH_BY_KIND_AND_COUNTRY[kind][countryCode](normalizedQuery)
  searchCache.write(key, [...results], Date.now() + ADDRESS_SEARCH_CACHE_TTL_MS)
  return results
}

const providerUnavailable = (): Error =>
  createError({ statusCode: 502, statusMessage: 'Address provider unavailable' })

/**
 * Searches addresses of one country: IGN for France, geoportail.lu for Luxembourg. Successful
 * results are kept in memory for 5 minutes per kind, country and query (trimmed, lowercased,
 * spaces collapsed), so repeating the same query does not spend the geocoders' quota again; a
 * failure is never kept.
 * @param query - Text typed by the customer
 * @param countryCode - Country picked next to the address field
 * @returns Address suggestions of that country
 */
export const searchAddresses = async (
  query: string,
  countryCode: CountryCode,
): Promise<AddressDetails[]> => {
  try {
    return await cachedSearch('address', query, countryCode)
  } catch {
    throw providerUnavailable()
  }
}

/**
 * Searches municipalities of one country, located at their centre: IGN `type=municipality` for
 * France, labelled `<name> (<postcode>)`; the fixed list of the Luxembourg communes near the
 * depot, matched on their name regardless of accents and case, labelled `<name> (LU)` with an
 * empty postcode. Cached like `searchAddresses`.
 * @param query - Text typed by the admin
 * @param countryCode - Country of the municipality
 * @returns Municipality suggestions of that country, at most five
 */
export const searchMunicipalities = async (
  query: string,
  countryCode: CountryCode,
): Promise<AddressDetails[]> => {
  try {
    return await cachedSearch('municipality', query, countryCode)
  } catch {
    throw providerUnavailable()
  }
}
