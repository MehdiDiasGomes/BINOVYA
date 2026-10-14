import type { AddressSearchResponse, BookingAddress, CountryCode } from '@/types/booking'

type AddressSearch = {
  suggestions: Ref<BookingAddress[]>
  isLoading: Ref<boolean>
  hasError: Ref<boolean>
  hasSearched: Ref<boolean>
  search: (text: string) => Promise<void>
  clear: () => void
}

const MIN_QUERY_LENGTH = 3

/**
 * Searches the addresses of the selected country through the server.
 * @param countryCode - Country picked next to the address field
 * @returns Suggestions, request state and the search trigger
 */
export const useAddressSearch = (countryCode: Ref<CountryCode>): AddressSearch => {
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
      const response = await $fetch<AddressSearchResponse>('/api/address/search', {
        query: { q: query, country: countryCode.value },
      })
      if (request !== latestRequest) {
        return
      }
      suggestions.value = response.suggestions
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
