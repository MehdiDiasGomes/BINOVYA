import type { BookingAddress, GeocodingResponse } from '@/types/booking'

import { GEOCODING_ENDPOINT } from '@/constants/booking'

type AddressSearch = {
  suggestions: Ref<BookingAddress[]>
  isLoading: Ref<boolean>
  hasError: Ref<boolean>
  hasSearched: Ref<boolean>
  search: (text: string) => Promise<void>
  clear: () => void
}

const MIN_QUERY_LENGTH = 3
const MAX_SUGGESTIONS = 5

/**
 * Searches French addresses through the public IGN geocoding service.
 * @returns Suggestions, request state and the search trigger
 */
export const useAddressSearch = (): AddressSearch => {
  const suggestions: Ref<BookingAddress[]> = ref([])
  const isLoading: Ref<boolean> = ref(false)
  const hasError: Ref<boolean> = ref(false)
  const hasSearched: Ref<boolean> = ref(false)
  let latestRequest = 0

  const clear = (): void => {
    latestRequest += 1
    suggestions.value = []
    isLoading.value = false
    hasError.value = false
    hasSearched.value = false
  }

  const search = async (text: string): Promise<void> => {
    const query: string = text.trim()
    if (query.length < MIN_QUERY_LENGTH) {
      clear()
      return
    }

    latestRequest += 1
    const request: number = latestRequest
    isLoading.value = true
    hasError.value = false

    try {
      const response = await $fetch<GeocodingResponse>(GEOCODING_ENDPOINT, {
        query: { q: query, autocomplete: 1, limit: MAX_SUGGESTIONS },
      })
      if (request !== latestRequest) {
        return
      }
      suggestions.value = response.features.map(feature => ({
        label: feature.properties.label,
        city: feature.properties.city,
        postcode: feature.properties.postcode,
        longitude: feature.geometry.coordinates[0],
        latitude: feature.geometry.coordinates[1],
      }))
      hasSearched.value = true
    } catch {
      if (request === latestRequest) {
        suggestions.value = []
        hasError.value = true
      }
    } finally {
      if (request === latestRequest) {
        isLoading.value = false
      }
    }
  }

  return { suggestions, isLoading, hasError, hasSearched, search, clear }
}
