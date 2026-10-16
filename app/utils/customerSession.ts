import type { JwtPayload } from '@supabase/supabase-js'

import { CUSTOMER_SESSION_MAX_AGE_SECONDS, SIGN_IN_METHODS } from '@/constants/account'

type SessionClaims = Pick<JwtPayload, 'amr'>

const readTimestamp = (entry: unknown): number | null =>
  typeof entry === 'object' &&
  entry !== null &&
  'method' in entry &&
  'timestamp' in entry &&
  typeof entry.method === 'string' &&
  SIGN_IN_METHODS.includes(entry.method) &&
  typeof entry.timestamp === 'number' &&
  Number.isFinite(entry.timestamp) &&
  entry.timestamp >= 0
    ? entry.timestamp
    : null

/**
 * Reads when the customer signed in with a login link, from the `amr` claim of the access token.
 * The value does not change when the token is refreshed.
 * @param claims - Claims of the access token, or null without session
 * @returns Sign-in time in seconds since the epoch, or null when the claim is missing
 */
export const signInTimestamp = (claims: SessionClaims | null): number | null => {
  const amr: unknown = claims?.amr
  const entries: unknown[] = Array.isArray(amr) ? amr : []
  const timestamps: number[] = entries
    .map(readTimestamp)
    .filter((timestamp): timestamp is number => timestamp !== null)
  return timestamps.length > 0 ? Math.min(...timestamps) : null
}

/**
 * Tells whether a customer session is past its absolute lifetime, counted from the sign-in with a
 * login link. A session without a readable sign-in time counts as expired.
 * @param claims - Claims of the access token, or null without session
 * @param nowSeconds - Current time in seconds since the epoch
 * @returns True when the session must be ended
 */
export const isSignInExpired = (claims: SessionClaims | null, nowSeconds: number): boolean => {
  const signedInAt: number | null = signInTimestamp(claims)
  return signedInAt === null || nowSeconds - signedInAt > CUSTOMER_SESSION_MAX_AGE_SECONDS
}

/**
 * Reads the claims of an access token without verifying it, to hide the customer area in the
 * browser. The server always verifies the token before serving data.
 * @param accessToken - JWT access token of the session
 * @returns Decoded claims, or null when the token cannot be read
 */
export const readAccessTokenClaims = (accessToken: string | undefined): SessionClaims | null => {
  try {
    const payload: string = accessToken?.split('.')[1] ?? ''
    const binary: string = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const json: string = new TextDecoder().decode(
      Uint8Array.from(binary, character => character.charCodeAt(0)),
    )
    const claims: unknown = JSON.parse(json)
    return typeof claims === 'object' && claims !== null ? (claims as SessionClaims) : null
  } catch {
    return null
  }
}
