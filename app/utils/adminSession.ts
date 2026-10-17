import type { JwtPayload } from '@supabase/supabase-js'

import { ADMIN_SESSION_MAX_AGE_SECONDS } from '@/constants/account'
import { ADMIN_ROLE } from '@/constants/pro'
import { isSignInExpired } from '@/utils/customerSession'

type AdminRoleClaims = Pick<JwtPayload, 'app_metadata'>

type AdminClaims = Pick<JwtPayload, 'amr' | 'app_metadata'>

/**
 * Tells whether claims carry the BINOVYA admin role, from `app_metadata.role`, which only the
 * server can write (never `user_metadata`, editable by the user). Says nothing about the session.
 * @param claims - Claims of the access token or Supabase user, or null without session
 * @returns True when the role is admin
 */
export const hasAdminRole = (claims: AdminRoleClaims | null): boolean =>
  claims?.app_metadata?.role === ADMIN_ROLE

/**
 * Tells whether access token claims open the BINOVYA Pro area: admin role and a sign-in with a
 * login link less than seven days old. A password session is never admin.
 * @param claims - Claims of the access token, or null without session
 * @param nowSeconds - Current time in seconds since the epoch
 * @returns True when the session is an active admin session
 */
export const isActiveAdminClaims = (claims: AdminClaims | null, nowSeconds: number): boolean =>
  hasAdminRole(claims) && !isSignInExpired(claims, nowSeconds, ADMIN_SESSION_MAX_AGE_SECONDS)
