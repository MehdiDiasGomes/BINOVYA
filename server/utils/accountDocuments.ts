import { createMemoryCache, type MemoryCache } from './memoryCache'

import type {
  AccountBookingDocuments,
  AccountBookingPhotos,
  AccountBookingRecord,
} from '@/types/account'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

import {
  ACCOUNT_PHOTO_URL_LIFETIME_SECONDS,
  PAYMENT_RECEIPT_CACHE_MAX_ENTRIES,
  PAYMENT_RECEIPT_CACHE_TTL_MS,
  PAYMENT_RECEIPT_MISS_CACHE_TTL_MS,
  PAYMENT_RECEIPT_TIMEOUT_MS,
  STRIPE_RECEIPT_HOST_SUFFIX,
} from '@/constants/account'
import { INTERVENTION_PHOTOS_BUCKET } from '@/constants/pro'

type PhotoRow = Pick<
  Database['public']['Tables']['intervention_photos']['Row'],
  'kind' | 'storage_path'
>

type SignedUrl = {
  path: string | null
  signedUrl: string | null
}

const receiptCache: MemoryCache<string | null> = createMemoryCache<string | null>(
  PAYMENT_RECEIPT_CACHE_MAX_ENTRIES,
)

const NO_PHOTOS: AccountBookingPhotos = { before: null, after: null }

const signPhotoUrls = async (
  client: SupabaseClient<Database>,
  rows: PhotoRow[],
): Promise<AccountBookingPhotos> => {
  if (rows.length === 0) {
    return NO_PHOTOS
  }
  const { data, error } = await client.storage.from(INTERVENTION_PHOTOS_BUCKET).createSignedUrls(
    rows.map(row => row.storage_path),
    ACCOUNT_PHOTO_URL_LIFETIME_SECONDS,
  )
  if (error) {
    throw error
  }
  const urls: Map<string, string> = new Map(
    data
      .filter((entry: SignedUrl): boolean => Boolean(entry.path && entry.signedUrl))
      .map((entry: SignedUrl): [string, string] => [entry.path ?? '', entry.signedUrl ?? '']),
  )
  return rows.reduce(
    (photos: AccountBookingPhotos, row: PhotoRow): AccountBookingPhotos => ({
      ...photos,
      [row.kind]: urls.get(row.storage_path) ?? null,
    }),
    NO_PHOTOS,
  )
}

const loadPhotoUrls = async (
  client: SupabaseClient<Database>,
  bookingId: string,
): Promise<AccountBookingPhotos> => {
  try {
    const { data, error } = await client
      .from('intervention_photos')
      .select('kind, storage_path')
      .eq('booking_id', bookingId)
    if (error) {
      throw error
    }
    return await signPhotoUrls(client, data)
  } catch {
    console.error(`Intervention photos unavailable for booking ${bookingId}`)
    return NO_PHOTOS
  }
}

const isStripeReceiptUrl = (value: string): boolean => {
  try {
    const url: URL = new URL(value)
    return url.protocol === 'https:' && url.hostname.endsWith(STRIPE_RECEIPT_HOST_SUFFIX)
  } catch {
    return false
  }
}

const receiptUrlOf = (paymentIntent: Stripe.PaymentIntent): string | null => {
  const charge: string | Stripe.Charge | null = paymentIntent.latest_charge
  const receiptUrl: string | null =
    typeof charge === 'object' ? (charge?.receipt_url ?? null) : null
  return receiptUrl && isStripeReceiptUrl(receiptUrl) ? receiptUrl : null
}

const cacheReceipt = (bookingId: string, url: string | null, now: number): void => {
  const ttl: number = url ? PAYMENT_RECEIPT_CACHE_TTL_MS : PAYMENT_RECEIPT_MISS_CACHE_TTL_MS
  receiptCache.write(bookingId, url, now + ttl)
}

const fetchReceiptUrl = async (
  bookingId: string,
  paymentIntentId: string,
): Promise<string | null> => {
  try {
    const paymentIntent: Stripe.PaymentIntent = await useStripe().paymentIntents.retrieve(
      paymentIntentId,
      { expand: ['latest_charge'] },
      { timeout: PAYMENT_RECEIPT_TIMEOUT_MS, maxNetworkRetries: 0 },
    )
    return receiptUrlOf(paymentIntent)
  } catch {
    console.error(`Payment receipt unavailable for booking ${bookingId}`)
    return null
  }
}

/**
 * Reads the Stripe receipt URL of a booking, kept in memory per booking for 5 minutes, or 30
 * seconds when Stripe gave none, so reloading a booking page neither spends the Stripe rate limit
 * shared with Checkout nor hammers Stripe during an outage. The cache is per server instance and
 * bounded, the least recently read entry leaving first.
 * @param record - Booking of this customer and its payment intent
 * @returns The receipt URL, or null when unavailable
 */
const loadReceiptUrl = async (record: AccountBookingRecord): Promise<string | null> => {
  if (!record.paymentIntentId) {
    return null
  }
  const bookingId: string = record.booking.id
  const cached: string | null | undefined = receiptCache.read(bookingId, Date.now())
  if (cached !== undefined) {
    return cached
  }
  const url: string | null = await fetchReceiptUrl(bookingId, record.paymentIntentId)
  cacheReceipt(bookingId, url, Date.now())
  return url
}

/**
 * Loads what the customer can open from a booking page: the before and after photos, through
 * signed URLs valid 10 minutes generated at each view, only once the intervention is completed,
 * and the Stripe payment receipt (`latest_charge.receipt_url` of the payment intent), which
 * reflects a refund. Relies on RLS: the client must carry the customer session, and the booking
 * must have been loaded for this customer first. Never throws: a missing photo, receipt or a
 * Stripe error only leaves the entry empty.
 * @param client - Supabase client of the logged-in customer
 * @param record - Booking of this customer and its payment intent, see `loadAccountBooking`
 * @returns Signed photo URLs and the receipt URL, null when unavailable
 */
export const loadAccountBookingDocuments = async (
  client: SupabaseClient<Database>,
  record: AccountBookingRecord,
): Promise<AccountBookingDocuments> => {
  const [photos, receiptUrl]: [AccountBookingPhotos, string | null] = await Promise.all([
    record.booking.status === 'completed' ? loadPhotoUrls(client, record.booking.id) : NO_PHOTOS,
    loadReceiptUrl(record),
  ])
  return { photos, receiptUrl }
}
