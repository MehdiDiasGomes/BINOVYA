import { findOrCreateCustomer } from './bookingCustomer'
import { normalizeEmail } from './emailAddress'
import { codedError } from './proErrors'

import type { Database } from '@/types/database.types'
import type { ProRejection } from '@/types/pro'
import type { ProCreateErrorCode, ProCreateRequest } from '@/types/proCreate'
import type { SupabaseClient } from '@supabase/supabase-js'

const OTHER_CUSTOMER_REPLAY: ProRejection<ProCreateErrorCode> = {
  statusCode: 400,
  statusMessage: 'Invalid booking',
  code: 'invalidInput',
}

const lookupFailed = (): Error =>
  createError({ statusCode: 500, statusMessage: 'Customer lookup failed' })

const findRequestCustomerId = async (
  client: SupabaseClient<Database>,
  requestId: string,
): Promise<string | null> => {
  const { data, error } = await client
    .from('bookings')
    .select('customer_id')
    .eq('admin_request_id', requestId)
    .maybeSingle()
  if (error) {
    throw lookupFailed()
  }
  return data?.customer_id ?? null
}

const findProfileEmail = async (
  client: SupabaseClient<Database>,
  profileId: string,
): Promise<string | null> => {
  const { data, error } = await client
    .from('profiles')
    .select('email')
    .eq('id', profileId)
    .maybeSingle()
  if (error) {
    throw lookupFailed()
  }
  return data?.email ?? null
}

/**
 * Returns the customer of an intervention BINOVYA Pro creates. A request id already used (a retry
 * after a timeout) keeps the customer of the booking it created, so a replay never creates an
 * account; a replay naming another email is refused like `admin_create_booking` refuses it.
 * Otherwise the customer matching the email is found or created.
 * @param client - Supabase client using the secret key, after `requireAdminForWrite`
 * @param request - Validated request
 * @returns Identifier of the customer
 * @throws 400 `invalidInput` when the request id belongs to a booking of another email, 500 when
 * the database fails
 */
export const resolveAdminBookingCustomer = async (
  client: SupabaseClient<Database>,
  request: ProCreateRequest,
): Promise<string> => {
  const existingId: string | null = await findRequestCustomerId(client, request.requestId)
  if (!existingId) {
    return findOrCreateCustomer(client, request.contact)
  }
  const email: string | null = await findProfileEmail(client, existingId)
  if (email !== normalizeEmail(request.contact.email)) {
    throw codedError(OTHER_CUSTOMER_REPLAY)
  }
  return existingId
}
