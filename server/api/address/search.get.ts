import { z } from 'zod'

import type {
  AddressDetails,
  AddressKind,
  AddressSearchResponse,
  BookingAddress,
} from '@/types/booking'

import { ADDRESS_KINDS, ADDRESS_SEARCH_MIN_LENGTH } from '@/constants/address'

const searchQuerySchema = z.object({
  q: z.string().trim().min(ADDRESS_SEARCH_MIN_LENGTH).max(200),
  country: z.enum(['FR', 'LU']),
  kind: z.enum(ADDRESS_KINDS).default('address'),
})

const SEARCH_BY_KIND: Record<AddressKind, typeof searchAddresses> = {
  address: searchAddresses,
  municipality: searchMunicipalities,
}

const DETAILS_SCHEMA_BY_KIND: Record<
  AddressKind,
  z.ZodType<AddressDetails, z.ZodTypeDef, unknown>
> = {
  address: addressDetailsSchema,
  municipality: municipalityDetailsSchema,
}

const SIGN_BY_KIND: Record<AddressKind, typeof signAddressToken> = {
  address: signAddressToken,
  municipality: signMunicipalityToken,
}

export default defineEventHandler(async (event): Promise<AddressSearchResponse> => {
  const { q, country, kind } = await getValidatedQuery(event, searchQuerySchema.parse)
  const secret: string = readAddressTokenSecret()
  const results: AddressDetails[] = await SEARCH_BY_KIND[kind](q, country)
  const suggestions: BookingAddress[] = results.flatMap((result): BookingAddress[] => {
    const parsed: z.SafeParseReturnType<unknown, AddressDetails> =
      DETAILS_SCHEMA_BY_KIND[kind].safeParse(result)
    return parsed.success
      ? [{ ...parsed.data, token: SIGN_BY_KIND[kind](parsed.data, secret) }]
      : []
  })
  return { suggestions }
})
