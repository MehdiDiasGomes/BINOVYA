import type { Database } from '@/types/database.types'
import type Stripe from 'stripe'

import { serverSupabaseServiceRole } from '#supabase/server'

const MAX_BODY_BYTES = 512 * 1024

export default defineEventHandler(async (event): Promise<{ received: true }> => {
  assertBodySize(event, MAX_BODY_BYTES)
  const { stripeWebhookSecret } = useRuntimeConfig()
  if (!stripeWebhookSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Webhook unavailable' })
  }

  const signature: string | undefined = getRequestHeader(event, 'stripe-signature')
  const rawBody: Buffer | undefined = await readRawBody(event, false)
  if (!signature || !rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Missing signature or body' })
  }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = useStripe().webhooks.constructEvent(rawBody, signature, stripeWebhookSecret)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid signature' })
  }

  await handleStripeEvent(serverSupabaseServiceRole<Database>(event), stripeEvent)
  return { received: true }
})
