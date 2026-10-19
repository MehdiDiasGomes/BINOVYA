import type { Database } from '@/types/database.types'
import type { ProCompleteErrorCode, ProCompleteResponse } from '@/types/proPhotos'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Error } from 'h3'

type CompleteRow = Database['public']['Functions']['admin_complete_booking']['Returns'][number]

type CompleteRefusal = NonNullable<CompleteRow['reason']>

type CompleteRejection = {
  statusCode: number
  statusMessage: string
  code: ProCompleteErrorCode
}

export type CompleteCommand = {
  bookingId: string
  force: boolean
}

const REJECTIONS: Record<CompleteRefusal, CompleteRejection> = {
  not_found: { statusCode: 404, statusMessage: 'Booking not found', code: 'notFound' },
  already_completed: {
    statusCode: 409,
    statusMessage: 'Booking already completed',
    code: 'alreadyCompleted',
  },
  not_paid: { statusCode: 422, statusMessage: 'Booking cannot be completed', code: 'notPaid' },
  future_date: { statusCode: 422, statusMessage: 'Booking date not reached', code: 'futureDate' },
  missing_photos: { statusCode: 409, statusMessage: 'Photos missing', code: 'missingPhotos' },
}

const completeRejection = (reason: CompleteRefusal): H3Error => {
  const rejection: CompleteRejection = REJECTIONS[reason]
  return createError({
    statusCode: rejection.statusCode,
    statusMessage: rejection.statusMessage,
    data: { code: rejection.code },
  })
}

/**
 * Finishes a paid intervention through `admin_complete_booking`. Without both photos it is refused
 * unless `force` is set; a future date, an unpaid, unknown or already completed booking is never
 * finished.
 * @param client - Supabase client using the secret key, after `requireAdminForWrite`
 * @param command - Booking and whether to finish without the photos
 * @returns Whether it was finished without photos and whether the photos mail must be sent, true
 * at most once per booking
 * @throws 404, 409 or 422 with `data.code`, 500 when the database fails
 */
export const completeBooking = async (
  client: SupabaseClient<Database>,
  command: CompleteCommand,
): Promise<ProCompleteResponse> => {
  const { data, error } = await client.rpc('admin_complete_booking', {
    p_booking_id: command.bookingId,
    p_force: command.force,
  })
  const row: CompleteRow | undefined = data?.[0]
  if (row && !row.ok && row.reason) {
    throw completeRejection(row.reason)
  }
  if (error || !row?.ok) {
    throw createError({ statusCode: 500, statusMessage: 'Completion failed' })
  }
  return {
    bookingId: command.bookingId,
    withoutPhotos: Boolean(row.without_photos),
    customerNotified: Boolean(row.send_photos_mail),
  }
}
