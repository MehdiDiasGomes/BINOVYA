import { z } from 'zod'

export const accountBookingParamsSchema = z.object({ id: z.string().uuid() })
