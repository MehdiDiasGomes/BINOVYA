import { z } from 'zod'

import {
  quoteBinCountSchema,
  quoteCommentSchema,
  quoteContactSchema,
} from '@/utils/quoteValidation'

export const quotePayloadSchema = z
  .object({
    contact: quoteContactSchema,
    address: bookingAddressSchema,
    smallBinCount: quoteBinCountSchema,
    largeBinCount: quoteBinCountSchema,
    plan: bookingPlanSchema.nullable(),
    comment: quoteCommentSchema,
    website: z.string().max(200),
  })
  .refine(payload => payload.smallBinCount + payload.largeBinCount > 0, {
    path: ['smallBinCount'],
  })
