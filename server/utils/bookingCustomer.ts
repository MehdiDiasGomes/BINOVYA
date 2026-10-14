import type { BookingContact } from '@/types/booking'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

type CustomerContact = Omit<BookingContact, 'phoneCountryCode'>

const findCustomerId = async (
  client: SupabaseClient<Database>,
  email: string,
): Promise<string | null> => {
  const { data, error } = await client
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Customer lookup failed' })
  }
  return data ? profileIdSchema.parse(data).id : null
}

/**
 * Returns the customer matching the email, creating the account and its profile on first booking.
 * An existing profile is never overwritten by an unauthenticated request.
 * @param client - Supabase client using the secret key
 * @param contact - Contact details typed in the booking form
 * @returns Identifier of the customer
 */
export const findOrCreateCustomer = async (
  client: SupabaseClient<Database>,
  contact: CustomerContact,
): Promise<string> => {
  const email: string = contact.email.trim().toLowerCase()
  const existingId: string | null = await findCustomerId(client, email)
  if (existingId) {
    return existingId
  }

  const { data, error } = await client.auth.admin.createUser({ email, email_confirm: true })
  if (error || !data.user) {
    const concurrentId: string | null = await findCustomerId(client, email)
    if (concurrentId) {
      return concurrentId
    }
    throw createError({ statusCode: 500, statusMessage: 'Customer creation failed' })
  }

  const { error: profileError } = await client.from('profiles').insert({
    id: data.user.id,
    email,
    first_name: contact.firstName.trim(),
    last_name: contact.lastName.trim(),
    phone: contact.phone.trim(),
  })
  if (profileError) {
    throw createError({ statusCode: 500, statusMessage: 'Customer profile creation failed' })
  }

  return data.user.id
}
