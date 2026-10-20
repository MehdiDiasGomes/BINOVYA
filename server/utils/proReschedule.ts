import type { Database } from '@/types/database.types'
import type {
  ProRescheduleErrorCode,
  ProRescheduleForceableCode,
  ProRescheduleResponse,
} from '@/types/proAvailability'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Error } from 'h3'

type RescheduleRow = Database['public']['Functions']['admin_reschedule_booking']['Returns'][number]

type RescheduleRefusal = NonNullable<RescheduleRow['reason']>

type RescheduleOverridable = NonNullable<RescheduleRow['overridden_reason']>

type RescheduleRejection = {
  statusCode: number
  statusMessage: string
  code: ProRescheduleErrorCode
}

export type RescheduleCommand = {
  bookingId: string
  date: string
  force: boolean
}

/** Codes of the refusals the admin can override, by database reason. */
export const FORCEABLE_REFUSAL_CODES: Record<RescheduleOverridable, ProRescheduleForceableCode> = {
  out_of_area: 'outOfArea',
  day_closed: 'dayClosed',
  day_full: 'dayFull',
  out_of_sector: 'outOfSector',
}

const REJECTIONS: Record<RescheduleRefusal, RescheduleRejection> = {
  not_found: { statusCode: 404, statusMessage: 'Booking not found', code: 'notFound' },
  not_paid: { statusCode: 422, statusMessage: 'Booking cannot be moved', code: 'notPaid' },
  invalid_date: { statusCode: 400, statusMessage: 'Invalid date', code: 'invalidDate' },
  same_date: { statusCode: 422, statusMessage: 'Same date', code: 'sameDate' },
  past_date: { statusCode: 422, statusMessage: 'Past date', code: 'pastDate' },
  too_far: { statusCode: 400, statusMessage: 'Date too far', code: 'tooFar' },
  too_frequent: { statusCode: 429, statusMessage: 'Too many moves', code: 'tooFrequent' },
  out_of_area: { statusCode: 409, statusMessage: 'Address out of area', code: 'outOfArea' },
  day_closed: { statusCode: 409, statusMessage: 'Day closed', code: 'dayClosed' },
  day_full: { statusCode: 409, statusMessage: 'Day full', code: 'dayFull' },
  out_of_sector: { statusCode: 409, statusMessage: 'Day out of sector', code: 'outOfSector' },
}

const rescheduleRejection = (reason: RescheduleRefusal): H3Error => {
  const rejection: RescheduleRejection = REJECTIONS[reason]
  return createError({
    statusCode: rejection.statusCode,
    statusMessage: rejection.statusMessage,
    data: { code: rejection.code },
  })
}

/**
 * Moves a paid booking to another date through `admin_reschedule_booking`, which checks the day
 * like a customer booking (service area, closed day, capacity, sector) unless `force` is set. A
 * past date or one more than a year ahead, an unpaid or unknown booking, or a booking already moved
 * three times in the last hour is never moved.
 * @param client - Supabase client using the secret key, after `requireAdminForWrite`
 * @param command - Booking, new ISO date and whether to override the forceable refusals
 * @returns Old and new dates, and every refusal that was overridden
 * @throws 409 for a forceable refusal, 404, 422, 429 or 400 for the others (see `data.code`), 500
 * when the database fails
 */
export const rescheduleBooking = async (
  client: SupabaseClient<Database>,
  command: RescheduleCommand,
): Promise<ProRescheduleResponse> => {
  const { data, error } = await client.rpc('admin_reschedule_booking', {
    p_booking_id: command.bookingId,
    p_new_date: command.date,
    p_force: command.force,
  })
  const row: RescheduleRow | undefined = data?.[0]
  if (row && !row.ok && row.reason) {
    throw rescheduleRejection(row.reason)
  }
  if (error || !row?.ok || !row.old_date || !row.new_date) {
    throw createError({ statusCode: 500, statusMessage: 'Reschedule failed' })
  }
  return {
    bookingId: command.bookingId,
    oldDate: row.old_date,
    newDate: row.new_date,
    overriddenCodes: (row.overridden_reasons ?? []).map(reason => FORCEABLE_REFUSAL_CODES[reason]),
  }
}
