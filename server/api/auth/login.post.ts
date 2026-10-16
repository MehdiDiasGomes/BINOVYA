import type { LoginResponse } from '@/types/account'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

import { serverSupabaseServiceRole } from '#supabase/server'
import { loginRequestSchema } from '@/utils/accountValidation'

const MAX_BODY_BYTES = 4 * 1024

const LOGIN_ACCEPTED: LoginResponse = { success: true }

const claimLoginLink = async (
  client: SupabaseClient<Database>,
  email: string,
): Promise<string | null> => {
  const { data, error } = await client.rpc('claim_login_link', { p_email: email })
  if (error) {
    console.error('Login link claim failed', error.code)
    return null
  }
  return data
}

export default defineEventHandler(async (event): Promise<LoginResponse> => {
  assertBodySize(event, MAX_BODY_BYTES)
  const result = await readValidatedBody(event, body => loginRequestSchema.safeParse(body))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid login request' })
  }

  const { email, locale, website } = result.data
  if (website) {
    return LOGIN_ACCEPTED
  }

  const client: SupabaseClient<Database> = serverSupabaseServiceRole<Database>(event)
  const customerId: string | null = await claimLoginLink(client, email)
  if (customerId) {
    event.waitUntil(sendLoginLinkEmail(client, { customerId, locale }))
  }

  return LOGIN_ACCEPTED
})
