import type { AddressDetails, CountryCode } from '@/types/booking'

type FranceFeature = {
  geometry: { coordinates: [number, number] }
  properties: { label: string; city: string; postcode: string }
}

type LuxembourgFeature = {
  geometry: { coordinates: [number, number] }
  properties: { label: string }
}

type FeatureCollection<Feature> = { features: Feature[] }

const FRANCE_ENDPOINT = 'https://data.geopf.fr/geocodage/search'
const LUXEMBOURG_ENDPOINT = 'https://apiv4.geoportail.lu/fulltextsearch'
const SEARCH_ORIGIN = { latitude: 49.306789, longitude: 6.149675 }
const LUXEMBOURG_EXTENT = '5.85,49.40,6.45,49.60'
const LUXEMBOURG_POSTCODE_MARKER = ', L-'
const LUXEMBOURG_POSTCODE_PATTERN = /^\d{4}$/
const SUGGESTION_LIMIT = 5
const REQUEST_TIMEOUT_MS = 5000

const searchFrance = async (query: string): Promise<AddressDetails[]> => {
  const response = await $fetch<FeatureCollection<FranceFeature>>(FRANCE_ENDPOINT, {
    query: {
      q: query,
      autocomplete: 1,
      limit: SUGGESTION_LIMIT,
      lat: SEARCH_ORIGIN.latitude,
      lon: SEARCH_ORIGIN.longitude,
    },
    timeout: REQUEST_TIMEOUT_MS,
  })
  return response.features.map(feature => ({
    label: feature.properties.label,
    city: feature.properties.city,
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
  const response = await $fetch<FeatureCollection<LuxembourgFeature>>(LUXEMBOURG_ENDPOINT, {
    query: { query, limit: SUGGESTION_LIMIT, layer: 'Adresse', extent: LUXEMBOURG_EXTENT },
    timeout: REQUEST_TIMEOUT_MS,
  })
  return response.features
    .map(toLuxembourgAddress)
    .filter((address): address is AddressDetails => address !== null)
}

const SEARCH_BY_COUNTRY: Record<CountryCode, (query: string) => Promise<AddressDetails[]>> = {
  FR: searchFrance,
  LU: searchLuxembourg,
}

/**
 * Searches addresses of one country: IGN for France, geoportail.lu for Luxembourg.
 * @param query - Text typed by the customer
 * @param countryCode - Country picked next to the address field
 * @returns Address suggestions of that country
 */
export const searchAddresses = async (
  query: string,
  countryCode: CountryCode,
): Promise<AddressDetails[]> => {
  try {
    return await SEARCH_BY_COUNTRY[countryCode](query)
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Address provider unavailable' })
  }
}
