import { type SupabaseClient, createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.types'

/**
 * Creates a Supabase client using the secret key, for server code that runs without a request,
 * such as a scheduled task. Request handlers use `serverSupabaseServiceRole` instead.
 * @returns Supabase client bypassing RLS
 */
export const createServiceRoleClient = (): SupabaseClient<Database> => {
  const config = useRuntimeConfig()
  const secretKey: string = config.supabase.secretKey || config.supabase.serviceKey || ''
  if (!secretKey) {
    throw createError({ statusCode: 503, statusMessage: 'Database unavailable' })
  }
  return createClient<Database>(config.public.supabase.url, secretKey, {
    auth: { detectSessionInUrl: false, persistSession: false, autoRefreshToken: false },
  })
}
