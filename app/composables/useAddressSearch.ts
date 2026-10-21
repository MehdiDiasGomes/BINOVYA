import type {
  AddressKind,
  AddressSearchResponse,
  BookingAddress,
  CountryCode,
} from '@/types/booking'

import { ADDRESS_SEARCH_MIN_LENGTH } from '@/constants/address'

type AddressSearch = {
  suggestions: Ref<BookingAddress[]>
  isLoading: Ref<boolean>
  hasError: Ref<boolean>
  hasSearched: Ref<boolean>
  search: (text: string) => Promise<void>
  clear: () => void
}

/**
 * Searches the addresses, or the municipalities, of the selected country through the server.
 * @param countryCode - Country picked next to the address field
 * @param kind - Full addresses (booking) or municipalities (imposed sector)
 * @returns Suggestions, request state and the search trigger
 */
export const useAddressSearch = (
  countryCode: Ref<CountryCode>,
  kind: AddressKind = 'address',
): AddressSearch => {
  const suggestions: Ref<BookingAddress[]> = ref([])
  const isLoading: Ref<boolean> = ref(false)
  const hasError: Ref<boolean> = ref(false)
  const hasSearched: Ref<boolean> = ref(false)
  let latestRequest: number = 0

  const clear = (): void => {
    latestRequest += 1
    suggestions.value = []
    isLoading.value = false
    hasError.value = false
    hasSearched.value = false
  }

  const search = async (text: string): Promise<void> => {
    const query: string = text.trim()
    if (query.length < ADDRESS_SEARCH_MIN_LENGTH) {
      clear()
      return
    }

    latestRequest += 1
    const request: number = latestRequest
    isLoading.value = true
    hasError.value = false

    try {
      const response: AddressSearchResponse = await $fetch<AddressSearchResponse>(
        '/api/address/search',
        {
          query: { q: query, country: countryCode.value, kind },
        },
      )
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
