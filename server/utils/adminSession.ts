import { rejectExpiredSession, requireSessionIdentity } from './session'

import type { Database } from '@/types/database.types'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

import { serverSupabaseClient } from '#supabase/server'
import { hasAdminRole, isActiveAdminClaims } from '@/utils/adminSession'

/**
 * Returns the identifier of the logged-in admin, read from the verified session cookie. The role
 * comes from `app_metadata.role`, never `user_metadata`, and the session must have been opened
 * with a login link less than seven days ago. A password session or an older one is revoked
 * server side in the background (see `rejectExpiredSession`).
 * @param event - Incoming request
 * @returns Identifier of the admin account
 * @throws 401 when there is no valid session or when it is past its absolute lifetime, 403 when
 * the account is not an admin
 */
export const requireAdmin = async (event: H3Event): Promise<string> => {
  const { userId, claims } = await requireSessionIdentity(event)
  if (!hasAdminRole(claims)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  if (!isActiveAdminClaims(claims, Date.now() / 1000)) {
    rejectExpiredSession(event, userId)
  }
  return userId
}

const isBanned = (user: User, now: number): boolean =>
  Boolean(user.banned_until) && Date.parse(user.banned_until ?? '') > now

/**
 * Guards a route that writes with the service role: `requireAdmin` first, then the account is
 * read again from Supabase Auth, because the role in the access token stays valid up to its
 * expiry after an admin is demoted, banned or deleted.
 * @param event - Incoming request
 * @returns Identifier of the admin account
 * @throws 401 when there is no valid session or Supabase Auth no longer knows the session, 403
 * when the account is not, or no longer, an admin
 */
export const requireAdminForWrite = async (event: H3Event): Promise<string> => {
  const userId: string = await requireAdmin(event)
  const client: SupabaseClient<Database> = await serverSupabaseClient<Database>(event)
  const user: User | null = await client.auth
    .getUser()
    .then(({ data }) => data.user)
    .catch(() => null)
  if (!user || user.id !== userId) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  if (!hasAdminRole(user) || isBanned(user, Date.now())) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return userId
}
