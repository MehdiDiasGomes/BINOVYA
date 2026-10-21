import { randomUUID } from 'node:crypto'

import { emailSitePageUrl, loadBookingEmailData, sendToCustomer } from './bookingEmails'
import { escapeHtml } from './mail'

import type { Database } from '@/types/database.types'
import type { BookingEmailData } from '@/types/email'
import type { SupabaseClient } from '@supabase/supabase-js'

import { generateBookingConfirmationEmail } from '@/templates/email/bookingCustomerEmails'
import { generatePaymentLinkEmail } from '@/templates/email/paymentLinkEmail'

export type PaymentLinkEmail = {
  bookingId: string
  paymentUrl: string
  paymentDueAt: string
  isResend: boolean
}

/**
 * Sends the customer the Stripe payment link of a booking BINOVYA created for them. The first
 * email uses the idempotency key `booking-payment-link-<id>`, each resend a key of its own, so a
 * resend is never swallowed by Resend. Never throws.
 * @param client - Supabase client using the secret key
 * @param email - Booking, Checkout URL, payment deadline and whether it is a resend
 * @returns True when the email was accepted
 */
export const sendPaymentLinkEmail = async (
  client: SupabaseClient<Database>,
  email: PaymentLinkEmail,
): Promise<boolean> => {
  try {
    const booking: BookingEmailData | null = await loadBookingEmailData(client, email.bookingId)
    if (!booking) {
      return false
    }
    return await sendToCustomer(
      booking,
      generatePaymentLinkEmail(
        { ...booking, paymentUrl: email.paymentUrl, paymentDueAt: email.paymentDueAt },
        escapeHtml,
      ),
      email.isResend ? `payment-link-resend-${randomUUID()}` : 'payment-link',
    )
  } catch {
    console.error(`Booking payment link email failed for ${email.bookingId}`)
    return false
  }
}

/**
 * Sends the customer the confirmation of a booking BINOVYA created already paid outside the
 * site. No alert goes to BINOVYA: the admin just created it. Never throws.
 * @param client - Supabase client using the secret key
 * @param bookingId - Identifier of the booking
 * @returns True when the email was accepted
 */
export const sendOfflineBookingConfirmation = async (
  client: SupabaseClient<Database>,
  bookingId: string,
): Promise<boolean> => {
  try {
    const booking: BookingEmailData | null = await loadBookingEmailData(client, bookingId)
    if (!booking) {
      return false
    }
    return await sendToCustomer(
      booking,
      generateBookingConfirmationEmail(
        { ...booking, accountUrl: emailSitePageUrl('/login') },
        escapeHtml,
      ),
      'confirmation',
    )
  } catch {
    console.error(`Booking confirmation email failed for ${bookingId}`)
    return false
  }
}
