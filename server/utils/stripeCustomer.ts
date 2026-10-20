import { useStripe } from './stripe'

import type { AddressDetails, BookingLocale } from '@/types/booking'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

type BillingProfile = Pick<
  ProfileRow,
  'id' | 'email' | 'first_name' | 'last_name' | 'stripe_customer_id'
>

export type BillingAddress = Pick<AddressDetails, 'label' | 'city' | 'postcode' | 'countryCode'>

export type StripeCustomerRequest = {
  profileId: string
  address: BillingAddress
  locale: BookingLocale
}

const BILLING_PROFILE_COLUMNS = 'id, email, first_name, last_name, stripe_customer_id'

const RESOURCE_MISSING: string = 'resource_missing'

const customerUnavailable = (): Error =>
  createError({ statusCode: 500, statusMessage: 'Billing customer unavailable' })

const localitySuffix = (address: BillingAddress): string =>
  address.countryCode === 'LU'
    ? `, L-${address.postcode} ${address.city}`
    : ` ${address.postcode} ${address.city}`

const streetLine = (address: BillingAddress): string => {
  const suffix: string = localitySuffix(address)
  const street: string = address.label.endsWith(suffix)
    ? address.label.slice(0, -suffix.length).trim()
    : ''
  return street || address.label
}

const loadBillingProfile = async (
  client: SupabaseClient<Database>,
  profileId: string,
): Promise<BillingProfile> => {
  const { data, error } = await client
    .from('profiles')
    .select(BILLING_PROFILE_COLUMNS)
    .eq('id', profileId)
    .maybeSingle()
  if (error || !data) {
    throw customerUnavailable()
  }
  return data
}

const storeCustomerId = async (
  client: SupabaseClient<Database>,
  profileId: string,
  customerId: string,
): Promise<string> => {
  const { data, error } = await client
    .from('profiles')
    .update({ stripe_customer_id: customerId })
    .eq('id', profileId)
    .is('stripe_customer_id', null)
    .select('id')
  if (error) {
    throw customerUnavailable()
  }
  if (data.length > 0) {
    return customerId
  }
  const stored: string | null = (await loadBillingProfile(client, profileId)).stripe_customer_id
  if (!stored) {
    throw customerUnavailable()
  }
  return stored
}

const createStripeCustomer = (
  profile: BillingProfile,
  request: StripeCustomerRequest,
): Promise<Stripe.Response<Stripe.Customer>> =>
  useStripe().customers.create(
    {
      name: `${profile.first_name.trim()} ${profile.last_name.trim()}`,
      email: profile.email,
      address: {
        line1: streetLine(request.address),
        postal_code: request.address.postcode,
        city: request.address.city,
        country: request.address.countryCode,
      },
      preferred_locales: [request.locale],
      metadata: { profile_id: profile.id },
    },
    { idempotencyKey: `profile-customer-${profile.id}` },
  )

/**
 * Returns the Stripe customer billed for every booking of a BINOVYA customer, creating it on the
 * first payment with the name and email of the profile and the address of that booking. An
 * existing Stripe customer is never updated: an unauthenticated booking request must not rewrite
 * billing details, like the profile. The id is stored once (`stripe_customer_id` still empty);
 * when a concurrent request stored one first, that one is used.
 * @param client - Supabase client using the secret key
 * @param request - Profile, address of the booking and language of the invoices
 * @returns Stripe customer id (`cus_...`)
 * @throws 500 when the profile cannot be read or the id cannot be stored, the Stripe error when
 * the customer cannot be created
 */
export const ensureStripeCustomer = async (
  client: SupabaseClient<Database>,
  request: StripeCustomerRequest,
): Promise<string> => {
  const profile: BillingProfile = await loadBillingProfile(client, request.profileId)
  if (profile.stripe_customer_id) {
    return profile.stripe_customer_id
  }
  const customer: Stripe.Customer = await createStripeCustomer(profile, request)
  return storeCustomerId(client, profile.id, customer.id)
}

const isMissingCustomer = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === RESOURCE_MISSING

/**
 * Deletes the Stripe customer of a profile and clears `stripe_customer_id`, for the deletion of a
 * customer account. A customer already deleted at Stripe counts as deleted. Its invoices and
 * payments stay at Stripe for the accounting retention.
 * @param client - Supabase client using the secret key
 * @param profileId - Profile whose Stripe customer is deleted
 * @returns True when a Stripe customer was deleted, false when the profile had none
 * @throws 500 when the profile cannot be read or updated, 502 when Stripe refuses the deletion
 */
export const deleteProfileStripeCustomer = async (
  client: SupabaseClient<Database>,
  profileId: string,
): Promise<boolean> => {
  const customerId: string | null = (await loadBillingProfile(client, profileId)).stripe_customer_id
  if (!customerId) {
    return false
  }
  await useStripe()
    .customers.del(customerId)
    .catch((error: unknown) => {
      if (!isMissingCustomer(error)) {
        console.error(`Stripe customer deletion failed for profile ${profileId}`)
        throw createError({ statusCode: 502, statusMessage: 'Billing customer deletion failed' })
      }
    })
  const { error } = await client
    .from('profiles')
    .update({ stripe_customer_id: null })
    .eq('id', profileId)
    .eq('stripe_customer_id', customerId)
  if (error) {
    throw customerUnavailable()
  }
  return true
}
