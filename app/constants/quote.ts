import type { QuoteEquipment } from '@/types/quote'

export const QUOTE_MAX_PHOTOS = 3

export const QUOTE_MAX_PHOTO_BYTES = 5 * 1024 * 1024

export const QUOTE_MAX_BIN_COUNT = 50

export const QUOTE_COMMENT_MAX_LENGTH = 2000

export const QUOTE_ADDRESS_INPUT_ID: string = 'quote-address'

export const QUOTE_PHOTO_MIME_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp']

export const QUOTE_PHOTOS_BUCKET = 'quote-photos'

export const QUOTE_EQUIPMENT = [
  'bins',
  'pav',
  'urban_furniture',
  'signage',
] as const satisfies readonly QuoteEquipment[]

export const QUOTE_MAX_PHOTO_MEGABYTES: number = QUOTE_MAX_PHOTO_BYTES / (1024 * 1024)
