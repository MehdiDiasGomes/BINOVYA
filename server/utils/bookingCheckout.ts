import { bookingInvoiceCreation } from './bookingInvoice'
import { type BillingAddress, ensureStripeCustomer } from './stripeCustomer'

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
  profileId: string
  amountCents: number
  plan: BookingPlan
  scheduledDate: string
  address: BillingAddress
  locale: BookingLocale
  expiresAt?: number
  successUrl?: string
  cancelUrl?: string
}

type CustomerCheckoutInput = BookingCheckoutInput & {
  stripeCustomerId: string
}

const lineDescription = (input: BookingCheckoutInput): string =>
  CHECKOUT_MESSAGES[input.locale].checkout.lineDescription
    .replace('{date}', formatLongDate(input.scheduledDate, input.locale))
    .replace('{address}', (): string => input.address.label)

const invoiceDescription = (input: BookingCheckoutInput): string =>
  CHECKOUT_MESSAGES[input.locale].checkout.invoiceDescription
    .replace('{product}', productName(input.locale, input.plan))
    .replace('{date}', formatLongDate(input.scheduledDate, input.locale))
    .replace('{address}', (): string => input.address.label)

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
 * Opens a Stripe Checkout session for a booking that holds its slot, billed to the Stripe customer
 * of its profile, with an invoice created once the payment succeeds. The intervention address is
 * in the line and invoice descriptions, so an invoice names the property it pays for. The session
 * expires before the hold, so a payment can never complete on a slot that was already released:
 * after 31 minutes by default, or at `expiresAt` (Unix seconds, 30 minutes to 24 hours after
 * creation, see Stripe) for a longer hold. The customer returns to the booking page, or to
 * `successUrl` / `cancelUrl` when given.
 * @param input - Booking amount, plan, date, address, Stripe customer and optional expiry and
 * return pages
 * @returns Created Checkout session
 */
const createBookingCheckout = (
  input: CustomerCheckoutInput,
): Promise<Stripe.Response<Stripe.Checkout.Session>> =>
  useStripe().checkout.sessions.create(
    {
      mode: 'payment',
      allowed_payment_method_types: ['card'],
      client_reference_id: input.bookingId,
      customer: input.stripeCustomerId,
      locale: input.locale,
      expires_at: input.expiresAt ?? Math.floor(Date.now() / 1000) + CHECKOUT_LIFETIME_SECONDS,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: input.amountCents,
            product_data: {
              name: productName(input.locale, input.plan),
              description: lineDescription(input),
            },
          },
        },
      ],
      metadata: { booking_id: input.bookingId },
      payment_intent_data: { metadata: { booking_id: input.bookingId } },
      invoice_creation: bookingInvoiceCreation(input.bookingId, invoiceDescription(input)),
      success_url: input.successUrl ?? bookingPageUrl(input.locale, 'success'),
      cancel_url: input.cancelUrl ?? bookingPageUrl(input.locale, 'cancelled'),
    },
    { idempotencyKey: `booking-checkout-${input.bookingId}` },
  )

const openCheckout = async (
  client: SupabaseClient<Database>,
  checkout: BookingCheckoutInput,
): Promise<Stripe.Checkout.Session> => {
  const stripeCustomerId: string = await ensureStripeCustomer(client, {
    profileId: checkout.profileId,
    address: checkout.address,
    locale: checkout.locale,
  })
  return createBookingCheckout({ ...checkout, stripeCustomerId })
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

/**
 * Opens the Checkout session of a booking that holds its slot, billed to the Stripe customer of
 * its profile (created on the first payment, see `ensureStripeCustomer`), and stores it on the
 * booking. When the customer or the session cannot be created, or the session cannot be stored,
 * the session is expired and the slot released.
 * @param client - Supabase client using the secret key
 * @param checkout - Booking, profile, amount, plan, date, address and optional expiry and return
 * pages
 * @returns URL of the Checkout page
 * @throws 502 when Stripe refuses the customer or the session, 500 when it cannot be stored
 */
export const attachBookingCheckout = async (
  client: SupabaseClient<Database>,
  checkout: BookingCheckoutInput,
): Promise<string> => {
  const { bookingId } = checkout
  const session: Stripe.Checkout.Session = await openCheckout(client, checkout).catch(async () => {
    await expireUnpaidBooking(client, bookingId)
    throw createError({ statusCode: 502, statusMessage: 'Checkout creation failed' })
  })

  const { error } = await client
    .from('bookings')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', bookingId)
  if (error || !session.url) {
    await useStripe()
      .checkout.sessions.expire(session.id)
      .catch(() => null)
    await expireUnpaidBooking(client, bookingId)
    throw createError({ statusCode: 500, statusMessage: 'Checkout attachment failed' })
  }

  return session.url
}
