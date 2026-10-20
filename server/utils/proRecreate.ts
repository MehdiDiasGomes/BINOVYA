import { readAddressTokenSecret, signAddressToken } from './addressToken'

import type { AddressDetails } from '@/types/booking'
import type { Database } from '@/types/database.types'
import type { ProCreatePrefill } from '@/types/proCreate'
import type { SupabaseClient } from '@supabase/supabase-js'

type BookingRow = Database['public']['Tables']['bookings']['Row']

type ProfileRow = Database['public']['Tables']['profiles']['Row']

type RecreatedBooking = Pick<
  BookingRow,
  | 'customer_id'
  | 'address'
  | 'city'
  | 'postcode'
  | 'country_code'
  | 'latitude'
  | 'longitude'
  | 'plan'
  | 'small_bin_count'
  | 'large_bin_count'
  | 'household_collection_weekdays'
  | 'recycling_collection_weekdays'
  | 'price_source'
  | 'amount_total_cents'
  | 'admin_note'
>

type RecreatedCustomer = Pick<ProfileRow, 'email' | 'first_name' | 'last_name' | 'phone'>

const RECREATED_BOOKING_COLUMNS =
  'customer_id, address, city, postcode, country_code, latitude, longitude, plan, small_bin_count, large_bin_count, household_collection_weekdays, recycling_collection_weekdays, price_source, amount_total_cents, admin_note'

const unavailable = (): Error =>
  createError({ statusCode: 500, statusMessage: 'Intervention unavailable' })

const loadExpiredAdminBooking = async (
  client: SupabaseClient<Database>,
  bookingId: string,
): Promise<RecreatedBooking | null> => {
  const { data, error } = await client
    .from('bookings')
    .select(RECREATED_BOOKING_COLUMNS)
    .eq('id', bookingId)
    .eq('status', 'expired')
    .eq('created_by_admin', true)
    .not('stripe_checkout_session_id', 'is', null)
    .maybeSingle()
  if (error) {
    throw unavailable()
  }
  return data
}

const loadCustomer = async (
  client: SupabaseClient<Database>,
  customerId: string,
): Promise<RecreatedCustomer | null> => {
  const { data, error } = await client
    .from('profiles')
    .select('email, first_name, last_name, phone')
    .eq('id', customerId)
    .maybeSingle()
  if (error) {
    throw unavailable()
  }
  return data
}

const toPrefill = (booking: RecreatedBooking, customer: RecreatedCustomer): ProCreatePrefill => {
  const address: AddressDetails = {
    label: booking.address,
    city: booking.city,
    postcode: booking.postcode,
    countryCode: booking.country_code,
    latitude: booking.latitude,
    longitude: booking.longitude,
  }
  return {
    contact: {
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone,
    },
    address: { ...address, token: signAddressToken(address, readAddressTokenSecret()) },
    plan: booking.plan,
    smallBinCount: booking.small_bin_count,
    largeBinCount: booking.large_bin_count,
    householdCollectionWeekdays: booking.household_collection_weekdays,
    recyclingCollectionWeekdays: booking.recycling_collection_weekdays,
    quoteAmountCents: booking.price_source === 'quote' ? booking.amount_total_cents : null,
    note: booking.admin_note,
  }
}

/**
 * Loads what BINOVYA Pro needs to create again an intervention whose payment link expired: its
 * customer, address (signed again, as if just chosen in the address search), bins, plan,
 * collection days, quote price and internal note. Only a booking created by the admin whose
 * payment link was sent and expired qualifies, like the ones BINOVYA Pro lists.
 * @param client - Supabase client using the secret key, after `requireAdmin`
 * @param bookingId - Identifier of the expired booking
 * @returns Prefill of the intervention form, or null when no such booking exists
 * @throws 500 when the database cannot be read or the address cannot be signed
 */
export const loadRecreatePrefill = async (
  client: SupabaseClient<Database>,
  bookingId: string,
): Promise<ProCreatePrefill | null> => {
  const booking: RecreatedBooking | null = await loadExpiredAdminBooking(client, bookingId)
  const customer: RecreatedCustomer | null = booking
    ? await loadCustomer(client, booking.customer_id)
    : null
  return booking && customer ? toPrefill(booking, customer) : null
}
