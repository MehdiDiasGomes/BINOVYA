import type { AddressKind } from '@/types/booking'

export const ADDRESS_KINDS = ['address', 'municipality'] as const satisfies readonly AddressKind[]

export const ADDRESS_SEARCH_MIN_LENGTH: number = 3
