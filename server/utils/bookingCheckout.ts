import {
  bookingInvoiceCreation,
  createBookingCustomer,
  type BookingBilling,
} from './bookingInvoice'

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
  billing: BookingBilling
  locale: BookingLocale
}

const invoiceDescription = (input: BookingCheckoutInput): string =>
  CHECKOUT_MESSAGES[input.locale].checkout.invoiceDescription
    .replace('{product}', productName(input.locale, input.plan))
    .replace('{date}', formatLongDate(input.scheduledDate, input.locale))

/**
 * Checks that the site URL needed for the Checkout return pages is configured, before anything is
 * created for a booking.
 * @throws 503 « Payment unavailable » when `NUXT_SITE_URL` is missing or not https
 */
export const assertCheckoutSiteUrl = (): void => {
  try {
    resolveSiteUrl()
  } catch {
    console.error('Checkout unavailable: NUXT_SITE_URL is missing or not https')
    throw createError({ statusCode: 503, statusMessage: 'Payment unavailable' })
  }
}

/**
 * Builds the booking page URL Stripe Checkout sends the customer back to.
 * @param locale - Locale of the booking page
 * @param outcome - Whether the payment succeeded or was cancelled
 * @returns Absolute return URL
 */
export const bookingPageUrl = (locale: BookingLocale, outcome: CheckoutOutcome): string =>
  localizedSiteUrl(locale, `/booking?checkout=${outcome}`)

/**
 * Opens a Stripe Checkout session for a booking that holds its slot, billed to a Stripe customer
 * carrying the booking's name and address, with an invoice created once the payment succeeds.
 * The session expires before the hold, so a payment can never complete on a slot that was
 * already released.
 * @param input - Booking amount, plan, date and billing details
 * @returns Created Checkout session
 */
export const createBookingCheckout = async (
  input: BookingCheckoutInput,
): Promise<Stripe.Response<Stripe.Checkout.Session>> => {
  const customer: Stripe.Customer = await createBookingCustomer(
    input.bookingId,
    input.billing,
    input.locale,
  )
  return useStripe().checkout.sessions.create(
    {
      mode: 'payment',
      allowed_payment_method_types: ['card'],
      client_reference_id: input.bookingId,
      customer: customer.id,
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
      invoice_creation: bookingInvoiceCreation(input.bookingId, invoiceDescription(input)),
      success_url: bookingPageUrl(input.locale, 'success'),
      cancel_url: bookingPageUrl(input.locale, 'cancelled'),
    },
    { idempotencyKey: `booking-checkout-${input.bookingId}` },
  )
}

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
