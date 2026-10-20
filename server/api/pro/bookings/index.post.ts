import type { Database } from '@/types/database.types'
import type { ProCreateErrorCode, ProCreateResponse } from '@/types/proCreate'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ZodError } from 'zod'

import { serverSupabaseServiceRole } from '#supabase/server'

const MAX_BODY_BYTES = 8 * 1024

const proCreateValidationCode = (error: ZodError): ProCreateErrorCode => {
  if (isBeyondProHorizon(error)) {
    return 'tooFar'
  }
  return isInvalidQuoteAmount(error) ? 'invalidQuoteAmount' : 'invalidInput'
}

export default defineEventHandler(async (event): Promise<ProCreateResponse> => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  assertSameOrigin(event)
  await requireAdminForWrite(event)
  assertBodySize(event, MAX_BODY_BYTES)
  const body: ReturnType<typeof proCreateBookingSchema.safeParse> =
    proCreateBookingSchema.safeParse(await readBody(event))
  if (!body.success) {
    const code: ProCreateErrorCode = proCreateValidationCode(body.error)
    throw createError({ statusCode: 400, statusMessage: 'Invalid booking request', data: { code } })
  }
  requireSignedAddress(body.data.address)
  if (body.data.mode === 'payment_link') {
    assertCheckoutSiteUrl()
  }

  const client: SupabaseClient<Database> = serverSupabaseServiceRole<Database>(event)
  const customerId: string = await findOrCreateCustomer(client, body.data.contact)
  return createAndNotifyAdminBooking(client, { customerId, request: body.data })
})
