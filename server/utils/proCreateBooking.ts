import {
  attachBookingCheckout,
  bookingPageUrl,
  expireUnpaidBooking,
  isCheckoutInProgress,
} from './bookingCheckout'
import { sendOfflineBookingConfirmation, sendPaymentLinkEmail } from './bookingPaymentLinkEmails'
import { codedError } from './proErrors'
import { FORCEABLE_REFUSAL_CODES } from './proReschedule'

import type { BillingAddress } from './stripeCustomer'
import type { BookingPlan } from '@/types/booking'
import type { Database } from '@/types/database.types'
import type { ProRejection } from '@/types/pro'
import type {
  ProBookingMode,
  ProCreateErrorCode,
  ProCreateForceableCode,
  ProCreateRequest,
  ProCreateResponse,
} from '@/types/proCreate'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  PRO_CHECKOUT_EXPIRY_MARGIN_SECONDS,
  PRO_CREATE_TIMEOUT_MS,
  PRO_PAYMENT_LINK_HOLD_MINUTES,
} from '@/constants/proCreate'
import { paymentLinkDueAt } from '@/utils/proCreate'

type CreateRow = Database['public']['Functions']['admin_create_booking']['Returns'][number]

type CreateRefusal = NonNullable<CreateRow['reason']>

type BookingRow = Database['public']['Tables']['bookings']['Row']

type ReplayedBooking = Pick<
  BookingRow,
  | 'status'
  | 'payment_method'
  | 'stripe_checkout_session_id'
  | 'expires_at'
  | 'plan'
  | 'scheduled_date'
  | 'address'
  | 'city'
  | 'postcode'
  | 'country_code'
  | 'created_at'
>

type CreatedBooking = {
  bookingId: string
  totalCents: number
  holdExpiresAt: string | null
  overriddenCodes: ProCreateForceableCode[]
  isReplay: boolean
}

type PaymentLinkTarget = {
  bookingId: string
  amountCents: number
  holdExpiresAt: string
  plan: BookingPlan
  scheduledDate: string
  address: BillingAddress
}

type NotifiedBooking = {
  mode: ProBookingMode
  scheduledDate: string
  paymentDueAt: string | null
  isEmailSent: boolean
}

export type AdminBookingCommand = {
  customerId: string
  request: ProCreateRequest
}

const STRIPE_CHECKOUT_MAX_LIFETIME_SECONDS: number = 24 * 60 * 60

const MILLISECONDS_PER_SECOND: number = 1000

const PAYMENT_LINK_CANCEL_PATH: string = '/payment-link'

const REPLAYED_BOOKING_COLUMNS =
  'status, payment_method, stripe_checkout_session_id, expires_at, plan, scheduled_date, address, city, postcode, country_code, created_at'

const SETTLED_STATUSES: BookingRow['status'][] = ['paid', 'completed', 'cancelled']

const REJECTIONS: Record<CreateRefusal, ProRejection<ProCreateErrorCode>> = {
  invalid_input: { statusCode: 400, statusMessage: 'Invalid booking', code: 'invalidInput' },
  invalid_quantities: {
    statusCode: 400,
    statusMessage: 'Invalid quantities',
    code: 'invalidQuantities',
  },
  invalid_quote_amount: {
    statusCode: 400,
    statusMessage: 'Invalid quote amount',
    code: 'invalidQuoteAmount',
  },
  quote_required: { statusCode: 422, statusMessage: 'Quote required', code: 'quoteRequired' },
  customer_not_found: {
    statusCode: 422,
    statusMessage: 'Customer not found',
    code: 'customerNotFound',
  },
  past_date: { statusCode: 422, statusMessage: 'Past date', code: 'pastDate' },
  too_far: { statusCode: 400, statusMessage: 'Date too far', code: 'tooFar' },
  customer_pending: {
    statusCode: 409,
    statusMessage: 'Payment already pending',
    code: 'customerPending',
  },
  out_of_area: { statusCode: 409, statusMessage: 'Address out of area', code: 'outOfArea' },
  day_closed: { statusCode: 409, statusMessage: 'Day closed', code: 'dayClosed' },
  day_full: { statusCode: 409, statusMessage: 'Day full', code: 'dayFull' },
  out_of_sector: { statusCode: 409, statusMessage: 'Day out of sector', code: 'outOfSector' },
}

const PAYMENT_LINK_FAILED: ProRejection<ProCreateErrorCode> = {
  statusCode: 502,
  statusMessage: 'Payment link creation failed',
  code: 'paymentLinkFailed',
}

const REQUEST_IN_PROGRESS: ProRejection<ProCreateErrorCode> = {
  statusCode: 409,
  statusMessage: 'Request in progress',
  code: 'requestInProgress',
}

/**
 * Creates a booking for a customer through `admin_create_booking`, priced from the grid or by the
 * quote price, which checks the day like a customer booking (service area, closed day, capacity,
 * sector) unless `force` is set. The request id makes it idempotent: a replay returns the booking
 * already created with `isReplay`. A payment link booking holds its slot 1435 minutes, so it is
 * released before its Checkout session, which Stripe ends 24 hours after creation at the latest.
 * @param client - Supabase client using the secret key, after `requireAdminForWrite`
 * @param command - Customer and validated request
 * @returns Created or replayed booking, its price, the end of its hold and the refusals overridden
 * @throws 409 for a forceable refusal or a pending payment, 400 or 422 for the others (see
 * `data.code`), 500 when the database fails
 */
export const createAdminBooking = async (
  client: SupabaseClient<Database>,
  command: AdminBookingCommand,
): Promise<CreatedBooking> => {
  const { request } = command
  const { data, error } = await client.rpc('admin_create_booking', {
    p_customer_id: command.customerId,
    p_request_id: request.requestId,
    p_mode: request.mode,
    p_scheduled_date: request.date,
    p_address: request.address.label,
    p_city: request.address.city,
    p_postcode: request.address.postcode,
    p_country_code: request.address.countryCode,
    p_latitude: request.address.latitude,
    p_longitude: request.address.longitude,
    p_plan: request.plan,
    p_small_bin_count: request.smallBinCount,
    p_large_bin_count: request.largeBinCount,
    p_household_collection_weekdays: request.householdCollectionWeekdays,
    p_recycling_collection_weekdays: request.recyclingCollectionWeekdays,
    p_force: request.force,
    p_hold_minutes: PRO_PAYMENT_LINK_HOLD_MINUTES,
    p_quote_amount_cents: request.quoteAmountCents,
    p_note: request.note,
  })
  const row: CreateRow | undefined = data?.[0]
  if (row && !row.ok && row.reason) {
    throw codedError(REJECTIONS[row.reason])
  }
  if (error || !row?.ok || !row.new_booking_id || row.total_cents === null) {
    throw createError({ statusCode: 500, statusMessage: 'Booking creation failed' })
  }
  return {
    bookingId: row.new_booking_id,
    totalCents: row.total_cents,
    holdExpiresAt: row.hold_expires_at,
    overriddenCodes: (row.overridden_reasons ?? []).map(reason => FORCEABLE_REFUSAL_CODES[reason]),
    isReplay: row.is_replay,
  }
}

/**
 * Computes when the Checkout session of a payment link closes: one minute before the hold of the
 * booking ends, and never later than Stripe allows (24 hours after creation).
 * @param holdExpiresAt - End of the hold, ISO timestamp
 * @param now - Current time in milliseconds, injectable for tests
 * @returns Expiry of the session, in Unix seconds
 */
export const paymentLinkExpiresAt = (holdExpiresAt: string, now: number = Date.now()): number =>
  Math.min(
    Math.floor(Date.parse(holdExpiresAt) / MILLISECONDS_PER_SECOND),
    Math.floor(now / MILLISECONDS_PER_SECOND) + STRIPE_CHECKOUT_MAX_LIFETIME_SECONDS,
  ) - PRO_CHECKOUT_EXPIRY_MARGIN_SECONDS

const logReleaseOutcome = async (
  client: SupabaseClient<Database>,
  bookingId: string,
): Promise<void> => {
  const { data } = await client.from('bookings').select('status').eq('id', bookingId).maybeSingle()
  const outcome: string =
    data?.status === 'expired' ? 'booking released' : 'booking release not confirmed'
  console.error(`Payment link failed for booking ${bookingId}, ${outcome}`)
}

const sendNewPaymentLink = async (
  client: SupabaseClient<Database>,
  command: AdminBookingCommand,
  target: PaymentLinkTarget,
): Promise<NotifiedBooking> => {
  const expiresAt: number = paymentLinkExpiresAt(target.holdExpiresAt)
  const paymentUrl: string = await attachBookingCheckout(client, {
    bookingId: target.bookingId,
    profileId: command.customerId,
    amountCents: target.amountCents,
    plan: target.plan,
    scheduledDate: target.scheduledDate,
    address: target.address,
    locale: 'fr',
    expiresAt,
    successUrl: bookingPageUrl('fr', 'success'),
    cancelUrl: localizedSiteUrl('fr', PAYMENT_LINK_CANCEL_PATH),
  }).catch(async (error: unknown): Promise<never> => {
    if (isCheckoutInProgress(error)) {
      throw codedError(REQUEST_IN_PROGRESS)
    }
    await logReleaseOutcome(client, target.bookingId)
    throw codedError(PAYMENT_LINK_FAILED)
  })
  const paymentDueAt: string = new Date(expiresAt * MILLISECONDS_PER_SECOND).toISOString()
  const isEmailSent: boolean = await sendPaymentLinkEmail(client, {
    bookingId: target.bookingId,
    paymentUrl,
    paymentDueAt,
    isResend: false,
  })
  return { mode: 'payment_link', scheduledDate: target.scheduledDate, paymentDueAt, isEmailSent }
}

/**
 * Returns the billing address of a new booking as `admin_create_booking` stores it (trimmed), so a
 * replay opening its Checkout session from the booking row sends Stripe the same parameters.
 * @param address - Address of the request
 * @returns Trimmed label, city and postcode with the country code
 */
const storedAddress = (address: BillingAddress): BillingAddress => ({
  label: address.label.trim(),
  city: address.city.trim(),
  postcode: address.postcode.trim(),
  countryCode: address.countryCode,
})

const finishNewBooking = async (
  client: SupabaseClient<Database>,
  command: AdminBookingCommand,
  created: CreatedBooking,
): Promise<NotifiedBooking> => {
  if (command.request.mode === 'offline') {
    const isEmailSent: boolean = await sendOfflineBookingConfirmation(client, created.bookingId)
    return { mode: 'offline', scheduledDate: command.request.date, paymentDueAt: null, isEmailSent }
  }
  if (!created.holdExpiresAt) {
    await expireUnpaidBooking(client, created.bookingId)
    throw codedError(PAYMENT_LINK_FAILED)
  }
  const { request } = command
  return sendNewPaymentLink(client, command, {
    bookingId: created.bookingId,
    amountCents: created.totalCents,
    holdExpiresAt: created.holdExpiresAt,
    plan: request.plan,
    scheduledDate: request.date,
    address: storedAddress(request.address),
  })
}

const loadReplayedBooking = async (
  client: SupabaseClient<Database>,
  bookingId: string,
): Promise<ReplayedBooking> => {
  const { data, error } = await client
    .from('bookings')
    .select(REPLAYED_BOOKING_COLUMNS)
    .eq('id', bookingId)
    .maybeSingle()
  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: 'Booking creation failed' })
  }
  return data
}

const finishReplayedBooking = async (
  client: SupabaseClient<Database>,
  command: AdminBookingCommand,
  created: CreatedBooking,
): Promise<NotifiedBooking> => {
  const booking: ReplayedBooking = await loadReplayedBooking(client, created.bookingId)
  if (booking.payment_method === 'offline') {
    return {
      mode: 'offline',
      scheduledDate: booking.scheduled_date,
      paymentDueAt: null,
      isEmailSent: true,
    }
  }
  if (SETTLED_STATUSES.includes(booking.status)) {
    return {
      mode: 'payment_link',
      scheduledDate: booking.scheduled_date,
      paymentDueAt: null,
      isEmailSent: true,
    }
  }
  if (booking.status !== 'pending_payment' || !booking.expires_at) {
    throw codedError(PAYMENT_LINK_FAILED)
  }
  if (!booking.stripe_checkout_session_id) {
    if (Date.now() - Date.parse(booking.created_at) < PRO_CREATE_TIMEOUT_MS) {
      throw codedError(REQUEST_IN_PROGRESS)
    }
    return sendNewPaymentLink(client, command, {
      bookingId: created.bookingId,
      amountCents: created.totalCents,
      holdExpiresAt: booking.expires_at,
      plan: booking.plan,
      scheduledDate: booking.scheduled_date,
      address: {
        label: booking.address,
        city: booking.city,
        postcode: booking.postcode,
        countryCode: booking.country_code,
      },
    })
  }
  return {
    mode: 'payment_link',
    scheduledDate: booking.scheduled_date,
    paymentDueAt: paymentLinkDueAt(booking.expires_at),
    isEmailSent: true,
  }
}

/**
 * Finishes a booking the admin just created: for a payment link, opens its Checkout session
 * (released when Stripe fails) and emails the link; for an offline payment, emails the
 * confirmation. A replayed request sends nothing again: it returns the booking already created
 * (paid, completed or cancelled included), and only opens and emails its payment link when the
 * first request stopped before. While the first request may still be opening that link (booking
 * younger than the client timeout, or Stripe still busy with the same idempotency key), the replay
 * does nothing and answers 409 `requestInProgress`.
 * @param client - Supabase client using the secret key
 * @param command - Customer and validated request
 * @returns The created booking, as answered to BINOVYA Pro
 * @throws Same errors as `createAdminBooking`, 502 `paymentLinkFailed` when the Checkout session
 * cannot be opened or a replayed payment link booking was released, 409 `requestInProgress` when
 * a concurrent request is still opening it
 */
export const createAndNotifyAdminBooking = async (
  client: SupabaseClient<Database>,
  command: AdminBookingCommand,
): Promise<ProCreateResponse> => {
  const created: CreatedBooking = await createAdminBooking(client, command)
  const notified: NotifiedBooking = created.isReplay
    ? await finishReplayedBooking(client, command, created)
    : await finishNewBooking(client, command, created)
  return {
    bookingId: created.bookingId,
    mode: notified.mode,
    scheduledDate: notified.scheduledDate,
    amountTotalCents: created.totalCents,
    paymentDueAt: notified.paymentDueAt,
    overriddenCodes: created.overriddenCodes,
    isEmailSent: notified.isEmailSent,
    isReplay: created.isReplay,
  }
}
