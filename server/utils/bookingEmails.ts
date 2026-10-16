import type { Database } from '@/types/database.types'
import type { BookingEmailContent, BookingEmailData, CustomerEmailRow } from '@/types/email'
import type { SupabaseClient } from '@supabase/supabase-js'

import { generateBookingAdminEmail } from '@/templates/email/bookingAdminEmail'
import {
  generateBookingConfirmationEmail,
  generateBookingRefundEmail,
} from '@/templates/email/bookingCustomerEmails'
import { generatePhotosAvailableEmail } from '@/templates/email/photosAvailableEmail'
import { parseSecureUrl } from '@/utils/link'

type BookingRow = Database['public']['Tables']['bookings']['Row']

type BookingEmailRow = Pick<
  BookingRow,
  | 'id'
  | 'customer_id'
  | 'scheduled_date'
  | 'address'
  | 'plan'
  | 'small_bin_count'
  | 'large_bin_count'
  | 'amount_total_cents'
>

export const BOOKING_EMAIL_COLUMNS =
  'id, customer_id, scheduled_date, address, plan, small_bin_count, large_bin_count, amount_total_cents'

export const CUSTOMER_EMAIL_COLUMNS = 'id, email, first_name, last_name, phone'

/**
 * Merges a booking row and its customer profile into the data shared by every booking email.
 * @param booking - Booking row with the email columns
 * @param customer - Profile of the customer who booked
 * @returns Plain data, not escaped yet
 */
export const toBookingEmailData = (
  booking: BookingEmailRow,
  customer: CustomerEmailRow,
): BookingEmailData => ({
  id: booking.id,
  firstName: customer.first_name,
  lastName: customer.last_name,
  email: customer.email,
  phone: customer.phone,
  scheduledDate: booking.scheduled_date,
  address: booking.address,
  plan: booking.plan,
  smallBinCount: booking.small_bin_count,
  largeBinCount: booking.large_bin_count,
  amountTotalCents: booking.amount_total_cents,
})

/**
 * Loads a booking and its customer for an email. A failure returns null and is logged with the
 * booking id only.
 * @param client - Supabase client using the secret key
 * @param bookingId - Identifier of the booking
 * @returns Email data, or null when the booking or its customer cannot be read
 */
export const loadBookingEmailData = async (
  client: SupabaseClient<Database>,
  bookingId: string,
): Promise<BookingEmailData | null> => {
  const { data: booking } = await client
    .from('bookings')
    .select(BOOKING_EMAIL_COLUMNS)
    .eq('id', bookingId)
    .maybeSingle()
  const { data: customer } = booking
    ? await client
        .from('profiles')
        .select(CUSTOMER_EMAIL_COLUMNS)
        .eq('id', booking.customer_id)
        .maybeSingle()
    : { data: null }
  if (!booking || !customer) {
    console.error(`Booking emails skipped: booking ${bookingId} or its customer was not found`)
    return null
  }
  return toBookingEmailData(booking, customer)
}

/**
 * Sends a booking email to the customer, with BINOVYA as reply-to and the idempotency key
 * `booking-<kind>-<id>`. Never throws.
 * @param booking - Booking and its customer
 * @param content - Subject and HTML body of the email
 * @param kind - Short email kind, such as `confirmation` or `reminder`
 * @returns True when Resend accepted the email
 */
export const sendToCustomer = (
  booking: BookingEmailData,
  content: BookingEmailContent,
  kind: string,
): Promise<boolean> =>
  sendTransactionalEmail(
    {
      to: booking.email,
      ...content,
      replyTo: useRuntimeConfig().contactEmailTo || undefined,
      idempotencyKey: `booking-${kind}-${booking.id}`,
    },
    `Booking ${kind} email for ${booking.id}`,
  )

/**
 * Builds the absolute URL of a French page of the site for a link in an email. Unlike
 * `resolveSiteUrl`, it never throws: an email must still be sent without the link, so an unsafe or
 * missing `NUXT_SITE_URL` only omits it. It follows `parseSecureUrl`, like the footer links of
 * every email (https, or http on localhost only).
 * @param path - Path of the page, starting with a slash
 * @returns Page URL, or an empty string when `NUXT_SITE_URL` is missing or not safe to link
 */
export const emailSitePageUrl = (path: string): string => {
  const secureSiteUrl: URL | null = parseSecureUrl(useRuntimeConfig().siteUrl)
  return secureSiteUrl ? new URL(path, secureSiteUrl).toString() : ''
}

const sendAdminAlert = async (booking: BookingEmailData): Promise<void> => {
  const { contactEmailTo } = useRuntimeConfig()
  if (!contactEmailTo) {
    console.warn('Booking admin alert skipped: NUXT_CONTACT_EMAIL_TO is not set')
    return
  }
  await sendTransactionalEmail(
    {
      to: contactEmailTo,
      ...generateBookingAdminEmail(booking, escapeHtml),
      replyTo: booking.email,
      idempotencyKey: `booking-admin-alert-${booking.id}`,
    },
    `Booking admin alert for ${booking.id}`,
  )
}

/**
 * Sends the confirmation to the customer and the alert to BINOVYA for a newly paid booking.
 * Never throws: a failure is logged and the payment flow continues.
 * @param client - Supabase client using the secret key
 * @param bookingId - Identifier of the booking that was just paid
 */
export const sendBookingPaidEmails = async (
  client: SupabaseClient<Database>,
  bookingId: string,
): Promise<void> => {
  try {
    const booking: BookingEmailData | null = await loadBookingEmailData(client, bookingId)
    if (!booking) {
      return
    }
    await Promise.all([
      sendToCustomer(
        booking,
        generateBookingConfirmationEmail(
          { ...booking, accountUrl: emailSitePageUrl('/login') },
          escapeHtml,
        ),
        'confirmation',
      ),
      sendAdminAlert(booking),
    ])
  } catch {
    console.error(`Booking paid emails failed for ${bookingId}`)
  }
}

/**
 * Tells the customer that a late payment was refunded and the booking cancelled. The Resend
 * idempotency key prevents a second email when Stripe redelivers the event. Never throws.
 * @param client - Supabase client using the secret key
 * @param bookingId - Identifier of the refunded booking
 */
export const sendBookingRefundEmail = async (
  client: SupabaseClient<Database>,
  bookingId: string,
): Promise<void> => {
  try {
    const booking: BookingEmailData | null = await loadBookingEmailData(client, bookingId)
    if (!booking) {
      return
    }
    await sendToCustomer(
      booking,
      generateBookingRefundEmail(
        { ...booking, bookingUrl: emailSitePageUrl('/booking') },
        escapeHtml,
      ),
      'refund',
    )
  } catch {
    console.error(`Booking refund email failed for ${bookingId}`)
  }
}

const hostOf = (url: string): string | null => {
  try {
    return url ? new URL(url).host : null
  } catch {
    return null
  }
}

/**
 * Checks that a login link targets an allowed host over https, or plain http on localhost only.
 * @param loginUrl - Link to put in the email
 * @param allowedHosts - Hosts the link may point to, such as the Supabase and site hosts
 * @returns True when the link is safe to send
 */
export const isAllowedLoginUrl = (loginUrl: string, allowedHosts: string[]): boolean => {
  const url: URL | null = parseSecureUrl(loginUrl)
  return url !== null && allowedHosts.includes(url.host)
}

/**
 * Tells the customer that the before and after photos of a booking are available. The login link
 * must point to the Supabase or site host, see `isAllowedLoginUrl`. Never throws.
 * @param booking - Completed booking and its customer, see `loadBookingEmailData`
 * @param loginUrl - One-click login link to the customer area
 * @returns True when Resend accepted the email
 */
export const sendPhotosAvailableEmail = async (
  booking: BookingEmailData,
  loginUrl: string,
): Promise<boolean> => {
  try {
    const config = useRuntimeConfig()
    const { siteUrl } = config
    const allowedHosts: string[] = [hostOf(config.public.supabase.url), hostOf(siteUrl)].filter(
      (host): host is string => host !== null,
    )
    if (!isAllowedLoginUrl(loginUrl, allowedHosts)) {
      console.error(`Booking photos email skipped for ${booking.id}: login URL not allowed`)
      return false
    }
    return await sendToCustomer(
      booking,
      generatePhotosAvailableEmail({ ...booking, loginUrl, siteUrl }, escapeHtml),
      'photos',
    )
  } catch {
    console.error(`Booking photos email failed for ${booking.id}`)
    return false
  }
}
