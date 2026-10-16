import type { AccountBooking, AccountPhoto } from '@/types/account'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

import { ACCOUNT_BOOKING_STATUSES, ACCOUNT_PHOTO_URL_LIFETIME_SECONDS } from '@/constants/account'

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

type PhotoRow = Pick<
  Database['public']['Tables']['intervention_photos']['Row'],
  'booking_id' | 'kind' | 'storage_path'
>

const BOOKING_COLUMNS =
  'id, scheduled_date, address, plan, small_bin_count, large_bin_count, amount_total_cents, status'

const PHOTO_BUCKET = 'intervention-photos'

const isAccountStatus = (status: string): status is AccountBooking['status'] =>
  (ACCOUNT_BOOKING_STATUSES as string[]).includes(status)

const signPhotos = async (
  client: SupabaseClient<Database>,
  rows: PhotoRow[],
): Promise<Map<string, string>> => {
  if (rows.length === 0) {
    return new Map()
  }
  const { data, error } = await client.storage.from(PHOTO_BUCKET).createSignedUrls(
    rows.map(row => row.storage_path),
    ACCOUNT_PHOTO_URL_LIFETIME_SECONDS,
  )
  if (error) {
    console.error('Account photo signing failed')
    return new Map()
  }
  return new Map(
    data.flatMap((entry): [string, string][] =>
      entry.path && entry.signedUrl && !entry.error ? [[entry.path, entry.signedUrl]] : [],
    ),
  )
}

const loadPhotos = async (
  client: SupabaseClient<Database>,
  bookingIds: string[],
): Promise<Map<string, AccountPhoto[]>> => {
  const photosByBooking: Map<string, AccountPhoto[]> = new Map()
  if (bookingIds.length === 0) {
    return photosByBooking
  }
  const { data, error } = await client
    .from('intervention_photos')
    .select('booking_id, kind, storage_path')
    .in('booking_id', bookingIds)
  if (error) {
    console.error('Account photos lookup failed')
    return photosByBooking
  }
  const signedUrls: Map<string, string> = await signPhotos(client, data)
  data.forEach(row => {
    const url: string | undefined = signedUrls.get(row.storage_path)
    if (url) {
      photosByBooking.set(row.booking_id, [
        ...(photosByBooking.get(row.booking_id) ?? []),
        { kind: row.kind, url },
      ])
    }
  })
  return photosByBooking
}

const toAccountBooking = (row: BookingRow, photos: AccountPhoto[]): AccountBooking | null =>
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
        photos,
      }
    : null

/**
 * Loads the paid, completed and cancelled bookings of the logged-in customer, most recent first,
 * with fresh signed URLs for the photos of completed bookings. Relies on RLS: the client must
 * carry the customer session.
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
  const completedIds: string[] = data.filter(row => row.status === 'completed').map(row => row.id)
  const photos: Map<string, AccountPhoto[]> = await loadPhotos(client, completedIds)
  return data
    .map(row => toAccountBooking(row, photos.get(row.id) ?? []))
    .filter((booking): booking is AccountBooking => booking !== null)
}
