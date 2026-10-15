import type { BookingLocale, BookingPlan, CheckoutOutcome } from '@/types/booking'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

import { formatLongDate } from '@/utils/date'
import enBooking from '~~/i18n/locales/en/booking'
import frBooking from '~~/i18n/locales/fr/booking'

const CHECKOUT_LIFETIME_SECONDS = 31 * 60

type CheckoutMessages = Pick<typeof frBooking, 'plans' | 'checkout'>

const CHECKOUT_MESSAGES: Record<BookingLocale, CheckoutMessages> = { fr: frBooking, en: enBooking }

const productName = (locale: BookingLocale, plan: BookingPlan): string => {
  const messages: CheckoutMessages = CHECKOUT_MESSAGES[locale]
  return messages.checkout.productName.replace('{plan}', messages.plans[plan].title)
}

export type BookingCheckoutInput = {
  bookingId: string
  amountCents: number
  plan: BookingPlan
  scheduledDate: string
  email: string
  locale: BookingLocale
}

/**
 * Returns the public site URL used for the Checkout return pages. Refuses to run without it, and
 * outside development without https.
 * @returns Site URL without trailing slash
 */
export const resolveSiteUrl = (): string => {
  const { siteUrl } = useRuntimeConfig()
  if (!siteUrl || (!import.meta.dev && !siteUrl.startsWith('https://'))) {
    console.error('Checkout unavailable: NUXT_SITE_URL is missing or not https')
    throw createError({ statusCode: 503, statusMessage: 'Payment unavailable' })
  }
  return siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl
}

/**
 * Builds the booking page URL Stripe Checkout sends the customer back to.
 * @param locale - Locale of the booking page
 * @param outcome - Whether the payment succeeded or was cancelled
 * @returns Absolute return URL
 */
export const bookingPageUrl = (locale: BookingLocale, outcome: CheckoutOutcome): string => {
  const localePrefix: string = locale === 'fr' ? '' : `/${locale}`
  return `${resolveSiteUrl()}${localePrefix}/booking?checkout=${outcome}`
}

/**
 * Opens a Stripe Checkout session for a booking that holds its slot. The session expires before
 * the hold, so a payment can never complete on a slot that was already released.
 * @param input - Booking amount, plan, date and customer email
 * @returns Created Checkout session
 */
export const createBookingCheckout = (
  input: BookingCheckoutInput,
): Promise<Stripe.Response<Stripe.Checkout.Session>> =>
  useStripe().checkout.sessions.create(
    {
      mode: 'payment',
      allowed_payment_method_types: ['card'],
      client_reference_id: input.bookingId,
      customer_email: input.email,
      locale: input.locale,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_LIFETIME_SECONDS,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: input.amountCents,
            product_data: {
              name: productName(input.locale, input.plan),
              description: formatLongDate(input.scheduledDate, input.locale),
            },
          },
        },
      ],
      metadata: { booking_id: input.bookingId },
      payment_intent_data: { metadata: { booking_id: input.bookingId } },
      success_url: bookingPageUrl(input.locale, 'success'),
      cancel_url: bookingPageUrl(input.locale, 'cancelled'),
    },
    { idempotencyKey: `booking-checkout-${input.bookingId}` },
  )

/**
 * Releases the slot of an unpaid booking. A paid booking is never touched.
 * @param client - Supabase client using the secret key
 * @param bookingId - Booking to release
 */
export const expireUnpaidBooking = async (
  client: SupabaseClient<Database>,
  bookingId: string,
): Promise<void> => {
  const { error } = await client
    .from('bookings')
    .update({ status: 'expired' })
    .eq('id', bookingId)
    .eq('status', 'pending_payment')
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Booking release failed' })
  }
}
