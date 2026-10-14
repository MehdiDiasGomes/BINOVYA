import { z } from 'zod'

import type { AddressSearchResponse } from '@/types/booking'

const searchQuerySchema = z.object({
  q: z.string().trim().min(3).max(200),
  country: z.enum(['FR', 'LU']),
})

export default defineEventHandler(async (event): Promise<AddressSearchResponse> => {
  const { q, country } = await getValidatedQuery(event, searchQuerySchema.parse)
  return { suggestions: await searchAddresses(q, country) }
})
