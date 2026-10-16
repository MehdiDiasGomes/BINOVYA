import type { Database } from '@/types/database.types'
import type { JwtPayload, Session } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

import {
  serverSupabaseServiceRole,
  serverSupabaseSession,
  serverSupabaseUser,
} from '#supabase/server'
import { isSignInExpired } from '@/utils/customerSession'

const revokeSessions = async (event: H3Event, customerId: string): Promise<void> => {
  const session: Omit<Session, 'user'> | null = await serverSupabaseSession(event).catch(() => null)
  if (!session?.access_token) {
    return
  }
  const { error } = await serverSupabaseServiceRole<Database>(event)
    .auth.admin.signOut(session.access_token, 'global')
    .catch(() => ({ error: new Error('unreachable') }))
  if (error) {
    console.error(`Expired session revocation failed for ${customerId}`)
  }
}

/**
 * Returns the identifier of the logged-in customer, read from the verified session cookie. The
 * session must have been opened with a login link less than seven days ago; an older one is
 * revoked server side, refresh tokens included, in the background through `event.waitUntil` when
 * the runtime offers it, so the 401 never waits for nor depends on the revocation.
 * @param event - Incoming request
 * @returns Identifier of the customer
 * @throws 401 when there is no valid session or when it is past its absolute lifetime
 */
export const requireCustomerId = async (event: H3Event): Promise<string> => {
  const claims: JwtPayload | null = await serverSupabaseUser(event).catch(() => null)
  const customerId: unknown = claims?.sub
  if (typeof customerId !== 'string' || customerId.length === 0) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  if (isSignInExpired(claims, Date.now() / 1000)) {
    const revocation: Promise<void> = revokeSessions(event, customerId).catch(() => undefined)
    if (typeof event.waitUntil === 'function') {
      event.waitUntil(revocation)
    }
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  return customerId
}
