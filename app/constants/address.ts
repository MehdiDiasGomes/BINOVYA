import type { AddressKind } from '@/types/booking'

export const ADDRESS_KINDS = ['address', 'municipality'] as const satisfies readonly AddressKind[]

export const ADDRESS_SEARCH_MIN_LENGTH: number = 3

export const ADDRESS_SEARCH_CACHE_TTL_MS: number = 5 * 60 * 1000

export const ADDRESS_SEARCH_CACHE_MAX_ENTRIES: number = 500
