import { z } from 'zod'

import { honeypotSchema } from '@/utils/bookingValidation'
import {
  hasConsistentBins,
  quoteBinCountSchema,
  quoteCommentSchema,
  quoteContactSchema,
  quoteEquipmentSchema,
} from '@/utils/quoteValidation'

export const quotePayloadSchema = z
  .object({
    contact: quoteContactSchema,
    address: signedAddressSchema,
    equipment: quoteEquipmentSchema,
    smallBinCount: quoteBinCountSchema,
    largeBinCount: quoteBinCountSchema,
    plan: bookingPlanSchema.nullable(),
    comment: quoteCommentSchema,
    website: honeypotSchema,
  })
  .refine(hasConsistentBins, { path: ['smallBinCount'] })
