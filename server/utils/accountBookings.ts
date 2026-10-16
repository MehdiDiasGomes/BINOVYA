import type { AccountBooking } from '@/types/account'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

import { ACCOUNT_BOOKING_STATUSES } from '@/constants/account'

type BookingRow = Pick<
  Database['public']['Tables']['bookings']['Row'],
  | 'id'
  | 'scheduled_date'
  | 'address'
  | 'plan'
  | 'small_bin_count'
  | 'large_bin_count'
  | 'amount_total_cents'
  | 'status'
>

const BOOKING_COLUMNS =
  'id, scheduled_date, address, plan, small_bin_count, large_bin_count, amount_total_cents, status'

const isAccountStatus = (status: string): status is AccountBooking['status'] =>
  (ACCOUNT_BOOKING_STATUSES as string[]).includes(status)

const toAccountBooking = (row: BookingRow): AccountBooking | null =>
  isAccountStatus(row.status)
    ? {
        id: row.id,
        scheduledDate: row.scheduled_date,
        address: row.address,
        plan: row.plan,
        smallBinCount: row.small_bin_count,
        largeBinCount: row.large_bin_count,
        amountTotalCents: row.amount_total_cents,
        status: row.status,
      }
    : null

/**
 * Loads the paid, completed and cancelled bookings of the logged-in customer, most recent first.
 * Relies on RLS: the client must carry the customer session.
 * @param client - Supabase client of the logged-in customer
 * @param customerId - Identifier of the logged-in customer
 * @returns Bookings shown in the customer area
 */
export const loadAccountBookings = async (
  client: SupabaseClient<Database>,
  customerId: string,
): Promise<AccountBooking[]> => {
  const { data, error } = await client
    .from('bookings')
    .select(BOOKING_COLUMNS)
    .eq('customer_id', customerId)
    .in('status', ACCOUNT_BOOKING_STATUSES)
    .order('scheduled_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Bookings unavailable' })
  }
  return data.map(toAccountBooking).filter((booking): booking is AccountBooking => booking !== null)
}

/**
 * Loads one paid, completed or cancelled booking of the logged-in customer. Relies on RLS and
 * also filters on the customer, so a booking of someone else reads exactly like a missing one.
 * @param client - Supabase client of the logged-in customer
 * @param customerId - Identifier of the logged-in customer
 * @param bookingId - Identifier of the requested booking
 * @returns The booking, or null when it does not exist or is not visible to this customer
 */
export const loadAccountBooking = async (
  client: SupabaseClient<Database>,
  customerId: string,
  bookingId: string,
): Promise<AccountBooking | null> => {
  const { data, error } = await client
    .from('bookings')
    .select(BOOKING_COLUMNS)
    .eq('id', bookingId)
    .eq('customer_id', customerId)
    .in('status', ACCOUNT_BOOKING_STATUSES)
    .maybeSingle()
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Booking unavailable' })
  }
  return data ? toAccountBooking(data) : null
}
