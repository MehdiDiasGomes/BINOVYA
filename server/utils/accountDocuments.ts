import { createMemoryCache, type MemoryCache } from './memoryCache'

import type {
  AccountBookingDocuments,
  AccountBookingPhotos,
  AccountBookingRecord,
  AccountInvoiceLink,
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

type PaymentDocuments = Pick<AccountBookingDocuments, 'receiptUrl' | 'invoice' | 'isPaidOffline'>

type SignedUrl = {
  path: string | null
  signedUrl: string | null
}

const receiptCache: MemoryCache<string | null> = createMemoryCache<string | null>(
  PAYMENT_RECEIPT_CACHE_MAX_ENTRIES,
)

const invoiceCache: MemoryCache<AccountInvoiceLink | null> =
  createMemoryCache<AccountInvoiceLink | null>(PAYMENT_RECEIPT_CACHE_MAX_ENTRIES)

const NO_INVOICE_LINK: AccountInvoiceLink = { url: null, isPdf: false }

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

const isStripeDocumentUrl = (value: string): boolean => {
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
  return receiptUrl && isStripeDocumentUrl(receiptUrl) ? receiptUrl : null
}

const readThroughCache = async <Value>(
  cache: MemoryCache<Value | null>,
  bookingId: string,
  fetchValue: () => Promise<Value | null>,
): Promise<Value | null> => {
  const cached: Value | null | undefined = cache.read(bookingId, Date.now())
  if (cached !== undefined) {
    return cached
  }
  const value: Value | null = await fetchValue()
  const ttl: number = value ? PAYMENT_RECEIPT_CACHE_TTL_MS : PAYMENT_RECEIPT_MISS_CACHE_TTL_MS
  cache.write(bookingId, value, Date.now() + ttl)
  return value
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

const invoiceLinkOf = (invoice: Stripe.Invoice): AccountInvoiceLink | null => {
  if (invoice.invoice_pdf && isStripeDocumentUrl(invoice.invoice_pdf)) {
    return { url: invoice.invoice_pdf, isPdf: true }
  }
  if (invoice.hosted_invoice_url && isStripeDocumentUrl(invoice.hosted_invoice_url)) {
    return { url: invoice.hosted_invoice_url, isPdf: false }
  }
  return null
}

const fetchInvoiceLink = async (
  bookingId: string,
  invoiceId: string,
): Promise<AccountInvoiceLink | null> => {
  try {
    const invoice: Stripe.Invoice = await useStripe().invoices.retrieve(
      invoiceId,
      {},
      { timeout: PAYMENT_RECEIPT_TIMEOUT_MS, maxNetworkRetries: 0 },
    )
    return invoiceLinkOf(invoice)
  } catch {
    console.error(`Invoice unavailable for booking ${bookingId}`)
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
  const { paymentIntentId } = record
  if (!paymentIntentId) {
    return null
  }
  return readThroughCache(receiptCache, record.booking.id, () =>
    fetchReceiptUrl(record.booking.id, paymentIntentId),
  )
}

/**
 * Reads the Stripe invoice link of an invoiced booking, the PDF or else the hosted invoice page,
 * cached like the receipt.
 * @param bookingId - Booking of this customer
 * @param invoiceId - Stripe invoice of the booking
 * @returns The invoice link, its URL null when unavailable
 */
const loadInvoiceLink = async (bookingId: string, invoiceId: string): Promise<AccountInvoiceLink> =>
  (await readThroughCache(invoiceCache, bookingId, () => fetchInvoiceLink(bookingId, invoiceId))) ??
  NO_INVOICE_LINK

const OFFLINE_PAYMENT: PaymentDocuments = { receiptUrl: null, invoice: null, isPaidOffline: true }

const loadPaymentDocument = async (record: AccountBookingRecord): Promise<PaymentDocuments> => {
  if (record.isPaidOffline) {
    return OFFLINE_PAYMENT
  }
  return record.invoiceId
    ? {
        receiptUrl: null,
        invoice: await loadInvoiceLink(record.booking.id, record.invoiceId),
        isPaidOffline: false,
      }
    : { receiptUrl: await loadReceiptUrl(record), invoice: null, isPaidOffline: false }
}

/**
 * Loads what the customer can open from a booking page: the before and after photos, through
 * signed URLs valid 10 minutes generated at each view, only once the intervention is completed,
 * and the payment document. An invoiced booking gets its Stripe invoice (PDF, else the hosted
 * page); an older one keeps the Stripe payment receipt (`latest_charge.receipt_url` of the
 * payment intent), which reflects a refund. A booking paid outside the site (`payment_method`
 * offline) has no Stripe document and is never looked up at Stripe. Relies on RLS: the client
 * must carry the customer session, and the booking must have been loaded for this customer first.
 * Never throws: a missing photo, invoice, receipt or a Stripe error only leaves the entry empty.
 * @param client - Supabase client of the logged-in customer
 * @param record - Booking of this customer, its payment intent and invoice, see
 * `loadAccountBooking`
 * @returns Signed photo URLs, the receipt URL and the invoice link, null when unavailable
 */
export const loadAccountBookingDocuments = async (
  client: SupabaseClient<Database>,
  record: AccountBookingRecord,
): Promise<AccountBookingDocuments> => {
  const [photos, payment]: [AccountBookingPhotos, PaymentDocuments] = await Promise.all([
    record.booking.status === 'completed' ? loadPhotoUrls(client, record.booking.id) : NO_PHOTOS,
    loadPaymentDocument(record),
  ])
  return { photos, ...payment }
}
