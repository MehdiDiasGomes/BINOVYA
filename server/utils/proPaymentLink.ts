import { sendPaymentLinkEmail } from './bookingPaymentLinkEmails'
import { bookingNotFound, codedError } from './proErrors'
import { useStripe } from './stripe'

import type { Database } from '@/types/database.types'
import type { ProRejection } from '@/types/pro'
import type { ProPaymentLinkErrorCode, ProPaymentLinkResponse } from '@/types/proCreate'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

type ResendClaim = Database['public']['Functions']['admin_claim_checkout_link_resend']['Returns']

type ResendRefusal = Exclude<ResendClaim, 'ok' | 'not_found'>

type BookingRow = Database['public']['Tables']['bookings']['Row']

type LinkRow = Pick<
  BookingRow,
  'status' | 'stripe_checkout_session_id' | 'expires_at' | 'created_by_admin'
>

type OpenLink = {
  paymentUrl: string
  paymentDueAt: string
}

const MILLISECONDS_PER_SECOND: number = 1000

const REJECTIONS: Record<ResendRefusal, ProRejection<ProPaymentLinkErrorCode>> = {
  not_pending: { statusCode: 422, statusMessage: 'Booking not pending', code: 'notPending' },
  expired: { statusCode: 422, statusMessage: 'Payment link expired', code: 'linkExpired' },
  no_link: { statusCode: 422, statusMessage: 'No payment link', code: 'noLink' },
  too_frequent: { statusCode: 429, statusMessage: 'Too many resends', code: 'tooFrequent' },
}

const LINK_UNAVAILABLE: ProRejection<ProPaymentLinkErrorCode> = {
  statusCode: 409,
  statusMessage: 'Payment link unavailable',
  code: 'linkUnavailable',
}

const EMAIL_FAILED: ProRejection<ProPaymentLinkErrorCode> = {
  statusCode: 502,
  statusMessage: 'Payment link email failed',
  code: 'emailFailed',
}

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
    throw codedError(REJECTIONS[data])
  }
}

const loadLink = async (client: SupabaseClient<Database>, bookingId: string): Promise<LinkRow> => {
  const { data, error } = await client
    .from('bookings')
    .select('status, stripe_checkout_session_id, expires_at, created_by_admin')
    .eq('id', bookingId)
    .maybeSingle()
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Payment link resend failed' })
  }
  if (!data?.created_by_admin) {
    throw bookingNotFound()
  }
  return data
}

const isLinkPending = (link: LinkRow): boolean =>
  link.status === 'pending_payment' &&
  link.expires_at !== null &&
  Date.parse(link.expires_at) > Date.now()

const openLink = async (bookingId: string, sessionId: string): Promise<OpenLink> => {
  const session: Stripe.Checkout.Session | null = await useStripe()
    .checkout.sessions.retrieve(sessionId)
    .catch((): null => {
      console.error(`Checkout session unavailable for booking ${bookingId}`)
      return null
    })
  if (session?.status !== 'open' || !session.url) {
    throw codedError(LINK_UNAVAILABLE)
  }
  return {
    paymentUrl: session.url,
    paymentDueAt: new Date(session.expires_at * MILLISECONDS_PER_SECOND).toISOString(),
  }
}

/**
 * Emails the customer the Stripe payment link of a pending booking again. The still open Checkout
 * session is read from Stripe first, so a closed session never uses up a resend; the resend is
 * then claimed through `admin_claim_checkout_link_resend` (3 per hour at most), which also refuses
 * a booking no longer pending, and the URL is sent with an idempotency key of its own and the
 * expiry of the session as the deadline.
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
  const link: LinkRow = await loadLink(client, bookingId)
  const sessionId: string | null = link.stripe_checkout_session_id
  const openedLink: OpenLink | null =
    isLinkPending(link) && sessionId ? await openLink(bookingId, sessionId) : null
  await claimResend(client, bookingId)
  if (!openedLink) {
    throw codedError(REJECTIONS.no_link)
  }
  const isSent: boolean = await sendPaymentLinkEmail(client, {
    bookingId,
    paymentUrl: openedLink.paymentUrl,
    paymentDueAt: openedLink.paymentDueAt,
    isResend: true,
  })
  if (!isSent) {
    throw codedError(EMAIL_FAILED)
  }
  return { bookingId }
}
