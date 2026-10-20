import { sendPaymentLinkEmail } from './bookingPaymentLinkEmails'
import { bookingNotFound } from './proErrors'
import { useStripe } from './stripe'

import type { Database } from '@/types/database.types'
import type { ProPaymentLinkErrorCode, ProPaymentLinkResponse } from '@/types/proCreate'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Error } from 'h3'
import type Stripe from 'stripe'

type ResendClaim = Database['public']['Functions']['admin_claim_checkout_link_resend']['Returns']

type ResendRefusal = Exclude<ResendClaim, 'ok' | 'not_found'>

type PaymentLinkRejection = {
  statusCode: number
  statusMessage: string
  code: ProPaymentLinkErrorCode
}

type PendingLink = {
  sessionId: string
  paymentDueAt: string
}

const REJECTIONS: Record<ResendRefusal, PaymentLinkRejection> = {
  not_pending: { statusCode: 422, statusMessage: 'Booking not pending', code: 'notPending' },
  expired: { statusCode: 422, statusMessage: 'Payment link expired', code: 'linkExpired' },
  no_link: { statusCode: 422, statusMessage: 'No payment link', code: 'noLink' },
  too_frequent: { statusCode: 429, statusMessage: 'Too many resends', code: 'tooFrequent' },
}

const LINK_UNAVAILABLE: PaymentLinkRejection = {
  statusCode: 409,
  statusMessage: 'Payment link unavailable',
  code: 'linkUnavailable',
}

const EMAIL_FAILED: PaymentLinkRejection = {
  statusCode: 502,
  statusMessage: 'Payment link email failed',
  code: 'emailFailed',
}

const paymentLinkError = (rejection: PaymentLinkRejection): H3Error =>
  createError({
    statusCode: rejection.statusCode,
    statusMessage: rejection.statusMessage,
    data: { code: rejection.code },
  })

const claimResend = async (client: SupabaseClient<Database>, bookingId: string): Promise<void> => {
  const { data, error } = await client.rpc('admin_claim_checkout_link_resend', {
    p_booking_id: bookingId,
  })
  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: 'Payment link resend failed' })
  }
  if (data === 'not_found') {
    throw bookingNotFound()
  }
  if (data !== 'ok') {
    throw paymentLinkError(REJECTIONS[data])
  }
}

const loadPendingLink = async (
  client: SupabaseClient<Database>,
  bookingId: string,
): Promise<PendingLink> => {
  const { data, error } = await client
    .from('bookings')
    .select('stripe_checkout_session_id, expires_at')
    .eq('id', bookingId)
    .maybeSingle()
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Payment link resend failed' })
  }
  if (!data?.stripe_checkout_session_id || !data.expires_at) {
    throw paymentLinkError(REJECTIONS.no_link)
  }
  return { sessionId: data.stripe_checkout_session_id, paymentDueAt: data.expires_at }
}

const openSessionUrl = async (bookingId: string, sessionId: string): Promise<string> => {
  const session: Stripe.Checkout.Session | null = await useStripe()
    .checkout.sessions.retrieve(sessionId)
    .catch((): null => {
      console.error(`Checkout session unavailable for booking ${bookingId}`)
      return null
    })
  if (session?.status !== 'open' || !session.url) {
    throw paymentLinkError(LINK_UNAVAILABLE)
  }
  return session.url
}

/**
 * Emails the customer the Stripe payment link of a pending booking again. The resend is claimed
 * first through `admin_claim_checkout_link_resend` (3 per hour at most), then the URL of the
 * still open Checkout session is read from Stripe and sent with an idempotency key of its own.
 * @param client - Supabase client using the secret key, after `requireAdminForWrite`
 * @param bookingId - Identifier of the booking
 * @returns The booking whose link was sent
 * @throws 404, 422, 429 for a refused claim, 409 when the Stripe session is no longer open, 502
 * when the email fails (see `data.code`), 500 when the database fails
 */
export const resendPaymentLink = async (
  client: SupabaseClient<Database>,
  bookingId: string,
): Promise<ProPaymentLinkResponse> => {
  await claimResend(client, bookingId)
  const link: PendingLink = await loadPendingLink(client, bookingId)
  const paymentUrl: string = await openSessionUrl(bookingId, link.sessionId)
  const isSent: boolean = await sendPaymentLinkEmail(client, {
    bookingId,
    paymentUrl,
    paymentDueAt: link.paymentDueAt,
    isResend: true,
  })
  if (!isSent) {
    throw paymentLinkError(EMAIL_FAILED)
  }
  return { bookingId }
}
