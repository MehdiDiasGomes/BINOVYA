import { rejectExpiredSession, requireSessionIdentity } from './session'

import type { H3Event } from 'h3'

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
