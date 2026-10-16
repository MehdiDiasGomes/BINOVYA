import { z } from 'zod'

import type { AddressDetails, AddressSearchResponse, BookingAddress } from '@/types/booking'

const searchQuerySchema = z.object({
  q: z.string().trim().min(3).max(200),
  country: z.enum(['FR', 'LU']),
})

export default defineEventHandler(async (event): Promise<AddressSearchResponse> => {
  const { q, country } = await getValidatedQuery(event, searchQuerySchema.parse)
  const secret: string = readAddressTokenSecret()
  const addresses: AddressDetails[] = await searchAddresses(q, country)
  const suggestions: BookingAddress[] = addresses.flatMap((address): BookingAddress[] => {
    const result: z.SafeParseReturnType<unknown, AddressDetails> =
      addressDetailsSchema.safeParse(address)
    return result.success ? [{ ...result.data, token: signAddressToken(result.data, secret) }] : []
  })
  return { suggestions }
})
