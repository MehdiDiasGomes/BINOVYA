import { attachBookingCheckout, expireUnpaidBooking } from './bookingCheckout'
import { sendOfflineBookingConfirmation, sendPaymentLinkEmail } from './bookingPaymentLinkEmails'
import { FORCEABLE_REFUSAL_CODES } from './proReschedule'

import type { Database } from '@/types/database.types'
import type {
  ProCreateErrorCode,
  ProCreateForceableCode,
  ProCreateRequest,
  ProCreateResponse,
} from '@/types/proCreate'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Error } from 'h3'

type CreateRow = Database['public']['Functions']['admin_create_booking']['Returns'][number]

type CreateRefusal = NonNullable<CreateRow['reason']>

type CreateRejection = {
  statusCode: number
  statusMessage: string
  code: ProCreateErrorCode
}

type CreatedBooking = {
  bookingId: string
  totalCents: number
  holdExpiresAt: string | null
  overriddenCodes: ProCreateForceableCode[]
}

export type AdminBookingCommand = {
  customerId: string
  request: ProCreateRequest
}

const PAYMENT_LINK_HOLD_MINUTES: number = 1435

const CHECKOUT_EXPIRY_MARGIN_SECONDS: number = 60

const STRIPE_CHECKOUT_MAX_LIFETIME_SECONDS: number = 24 * 60 * 60

const REJECTIONS: Record<CreateRefusal, CreateRejection> = {
  invalid_input: { statusCode: 400, statusMessage: 'Invalid booking', code: 'invalidInput' },
  invalid_quantities: {
    statusCode: 400,
    statusMessage: 'Invalid quantities',
    code: 'invalidQuantities',
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

const createRejection = (reason: CreateRefusal): H3Error => {
  const rejection: CreateRejection = REJECTIONS[reason]
  return createError({
    statusCode: rejection.statusCode,
    statusMessage: rejection.statusMessage,
    data: { code: rejection.code },
  })
}

/**
 * Creates a booking for a customer through `admin_create_booking`, which prices it from the grid
 * and checks the day like a customer booking (service area, closed day, capacity, sector) unless
 * `force` is set. A payment link booking holds its slot 1435 minutes, so it is released before
 * its Checkout session, which Stripe ends 24 hours after creation at the latest.
 * @param client - Supabase client using the secret key, after `requireAdminForWrite`
 * @param command - Customer and validated request
 * @returns Created booking, its price, the end of its hold and the refusals overridden
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
    p_hold_minutes: PAYMENT_LINK_HOLD_MINUTES,
  })
  const row: CreateRow | undefined = data?.[0]
  if (row && !row.ok && row.reason) {
    throw createRejection(row.reason)
  }
  if (error || !row?.ok || !row.new_booking_id || row.total_cents === null) {
    throw createError({ statusCode: 500, statusMessage: 'Booking creation failed' })
  }
  return {
    bookingId: row.new_booking_id,
    totalCents: row.total_cents,
    holdExpiresAt: row.hold_expires_at,
    overriddenCodes: (row.overridden_reasons ?? []).map(reason => FORCEABLE_REFUSAL_CODES[reason]),
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
    Math.floor(Date.parse(holdExpiresAt) / 1000),
    Math.floor(now / 1000) + STRIPE_CHECKOUT_MAX_LIFETIME_SECONDS,
  ) - CHECKOUT_EXPIRY_MARGIN_SECONDS

const paymentLinkFailed = (): H3Error =>
  createError({
    statusCode: 502,
    statusMessage: 'Payment link creation failed',
    data: { code: 'paymentLinkFailed' satisfies ProCreateErrorCode },
  })

const finishPaymentLink = async (
  client: SupabaseClient<Database>,
  request: ProCreateRequest,
  created: CreatedBooking,
): Promise<boolean> => {
  const { holdExpiresAt } = created
  if (!holdExpiresAt) {
    await expireUnpaidBooking(client, created.bookingId)
    throw paymentLinkFailed()
  }
  const paymentUrl: string = await attachBookingCheckout(client, {
    bookingId: created.bookingId,
    amountCents: created.totalCents,
    plan: request.plan,
    scheduledDate: request.date,
    billing: {
      firstName: request.contact.firstName,
      lastName: request.contact.lastName,
      email: request.contact.email.trim().toLowerCase(),
      address: request.address,
    },
    locale: 'fr',
    expiresAt: paymentLinkExpiresAt(holdExpiresAt),
  }).catch((): never => {
    console.error(`Payment link failed for booking ${created.bookingId}, booking released`)
    throw paymentLinkFailed()
  })
  return sendPaymentLinkEmail(client, {
    bookingId: created.bookingId,
    paymentUrl,
    paymentDueAt: holdExpiresAt,
    isResend: false,
  })
}

/**
 * Finishes a booking the admin just created: for a payment link, opens its Checkout session
 * (released when Stripe fails) and emails the link; for an offline payment, emails the
 * confirmation.
 * @param client - Supabase client using the secret key
 * @param command - Customer and validated request
 * @returns The created booking, as answered to BINOVYA Pro
 * @throws Same errors as `createAdminBooking`, and 502 `paymentLinkFailed` when the Checkout
 * session cannot be opened
 */
export const createAndNotifyAdminBooking = async (
  client: SupabaseClient<Database>,
  command: AdminBookingCommand,
): Promise<ProCreateResponse> => {
  const { request } = command
  const created: CreatedBooking = await createAdminBooking(client, command)
  const isEmailSent: boolean =
    request.mode === 'payment_link'
      ? await finishPaymentLink(client, request, created)
      : await sendOfflineBookingConfirmation(client, created.bookingId)
  return {
    bookingId: created.bookingId,
    mode: request.mode,
    amountTotalCents: created.totalCents,
    paymentDueAt: request.mode === 'payment_link' ? created.holdExpiresAt : null,
    overriddenCodes: created.overriddenCodes,
    isEmailSent,
  }
}
