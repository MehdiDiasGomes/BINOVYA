import { rejectExpiredSession, requireSessionIdentity } from './session'

import type { H3Event } from 'h3'

import { isSignInExpired } from '@/utils/customerSession'

/**
 * Returns the identifier of the logged-in customer, read from the verified session cookie. The
 * session must have been opened with a login link less than seven days ago; an older one is
 * revoked server side in the background (see `rejectExpiredSession`).
 * @param event - Incoming request
 * @returns Identifier of the customer
 * @throws 401 when there is no valid session or when it is past its absolute lifetime
 */
export const requireCustomerId = async (event: H3Event): Promise<string> => {
  const { userId, claims } = await requireSessionIdentity(event)
  if (isSignInExpired(claims, Date.now() / 1000)) {
    rejectExpiredSession(event, userId)
  }
  return userId
}
