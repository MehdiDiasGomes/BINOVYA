import { z } from 'zod'

import { PRO_INTERVENTIONS_MAX_PAGE, PRO_STATUS_FILTERS } from '@/constants/pro'
import { isoDateSchema } from '@/utils/dateValidation'

export const proPlanningQuerySchema = z.object({ date: isoDateSchema.optional() })

export const proInterventionsQuerySchema = z
  .object({
    status: z.enum(PRO_STATUS_FILTERS).default('all'),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    page: z.coerce.number().int().min(1).max(PRO_INTERVENTIONS_MAX_PAGE).default(1),
  })
  .refine(query => !query.from || !query.to || query.from <= query.to, { path: ['to'] })
