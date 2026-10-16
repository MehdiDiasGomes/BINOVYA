import type { DeletionRequestResponse } from '@/types/account'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

import { serverSupabaseServiceRole } from '#supabase/server'

const PROFILE_COLUMNS = 'email, first_name, last_name, phone, deletion_requested_at'

const readRequestedAt = async (
  client: SupabaseClient<Database>,
  customerId: string,
): Promise<string> => {
  const { data, error } = await client
    .from('profiles')
    .select('deletion_requested_at')
    .eq('id', customerId)
    .maybeSingle()
  if (error || !data?.deletion_requested_at) {
    throw createError({ statusCode: 500, statusMessage: 'Deletion request failed' })
  }
  return data.deletion_requested_at
}

const cancelRequest = async (
  client: SupabaseClient<Database>,
  customerId: string,
  requestedAt: string,
): Promise<void> => {
  const { error } = await client
    .from('profiles')
    .update({ deletion_requested_at: null })
    .eq('id', customerId)
    .eq('deletion_requested_at', requestedAt)
  if (error) {
    console.error(`Deletion request reset failed for ${customerId}`, error.code)
  }
}

export default defineEventHandler(async (event): Promise<DeletionRequestResponse> => {
  assertSameOrigin(event)
  const customerId: string = await requireCustomerId(event)
  const client: SupabaseClient<Database> = serverSupabaseServiceRole<Database>(event)

  const { data: profile, error } = await client
    .from('profiles')
    .update({ deletion_requested_at: new Date().toISOString() })
    .eq('id', customerId)
    .is('deletion_requested_at', null)
    .select(PROFILE_COLUMNS)
    .maybeSingle()
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Deletion request failed' })
  }
  if (!profile?.deletion_requested_at) {
    return { requestedAt: await readRequestedAt(client, customerId) }
  }

  const requestedAt: string = profile.deletion_requested_at
  const isSent: boolean = await sendDeletionRequestAlert(customerId, {
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: profile.email,
    phone: profile.phone,
    requestedAt,
  })
  if (!isSent) {
    await cancelRequest(client, customerId, requestedAt)
    throw createError({ statusCode: 502, statusMessage: 'Deletion request alert failed' })
  }

  return { requestedAt }
})
