import type { Database } from '@/types/database.types'
import type { JwtPayload, Session } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

import {
  serverSupabaseServiceRole,
  serverSupabaseSession,
  serverSupabaseUser,
} from '#supabase/server'

type SessionIdentity = {
  userId: string
  claims: JwtPayload
}

const revokeSessions = async (event: H3Event, userId: string): Promise<void> => {
  const session: Omit<Session, 'user'> | null = await serverSupabaseSession(event).catch(() => null)
  if (!session?.access_token) {
    return
  }
  const { error } = await serverSupabaseServiceRole<Database>(event)
    .auth.admin.signOut(session.access_token, 'global')
    .catch(() => ({ error: new Error('unreachable') }))
  if (error) {
    console.error(`Expired session revocation failed for ${userId}`)
  }
}

/**
 * Reads the verified claims of the session cookie and the identifier of its user.
 * @param event - Incoming request
 * @returns Identifier of the user and claims of the access token
 * @throws 401 when there is no valid session
 */
export const requireSessionIdentity = async (event: H3Event): Promise<SessionIdentity> => {
  const claims: JwtPayload | null = await serverSupabaseUser(event).catch(() => null)
  const userId: unknown = claims?.sub
  if (!claims || typeof userId !== 'string' || userId.length === 0) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  return { userId, claims }
}

/**
 * Rejects a session past its absolute lifetime and revokes it server side, refresh tokens
 * included, in the background through `event.waitUntil`, so the 401
 * never waits for nor depends on the revocation.
 * @param event - Incoming request
 * @param userId - Identifier of the session user, for the log only
 * @throws 401 always
 */
export const rejectExpiredSession = (event: H3Event, userId: string): never => {
  const revocation: Promise<void> = revokeSessions(event, userId).catch(() => undefined)
  event.waitUntil(revocation)
  throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
}
