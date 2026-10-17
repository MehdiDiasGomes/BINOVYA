import type { AdminSessionState } from '@/types/pro'
import type { JwtPayload, Session } from '@supabase/supabase-js'
import type { RouteLocationRaw } from 'vue-router'

import { SESSION_EXPIRED_QUERY } from '@/constants/account'
import { PRO_LOGIN_PATH } from '@/constants/pro'
import { hasAdminRole, isActiveAdminClaims } from '@/utils/adminSession'
import { readAccessTokenClaims } from '@/utils/customerSession'

/**
 * Tells whether the visitor is logged in with an active BINOVYA admin session, from the Supabase
 * session or the verified user claims, to hide the BINOVYA Pro area in the browser: admin role and
 * a login link sign-in less than seven days old. The server checks both again on every request.
 * @returns Admin, expired admin and session flags, the Pro login route with the session expired
 * notice, an action ending the session, one also opening the Pro login and one opening it with the
 * notice
 */
export const useAdminSession = (): AdminSessionState => {
  const session: Ref<Omit<Session, 'user'> | null> = useSupabaseSession()
  const user: Ref<JwtPayload | null> = useSupabaseUser()
  const localePath = useLocalePath()
  const { endSession } = useCustomerSession()

  const claims: ComputedRef<Pick<JwtPayload, 'amr' | 'app_metadata'> | null> = computed(
    () => user.value ?? readAccessTokenClaims(session.value?.access_token),
  )

  const hasSession: ComputedRef<boolean> = computed(
    () => session.value !== null || user.value !== null,
  )

  const isAdmin: ComputedRef<boolean> = computed(() =>
    isActiveAdminClaims(claims.value, Date.now() / 1000),
  )

  const isExpiredAdmin: ComputedRef<boolean> = computed(
    () => hasAdminRole(claims.value) && !isAdmin.value,
  )

  const expiredLoginRoute: ComputedRef<RouteLocationRaw> = computed(() => ({
    path: localePath(PRO_LOGIN_PATH),
    query: { session: SESSION_EXPIRED_QUERY },
  }))

  const leave = async (): Promise<void> => {
    await endSession()
    await navigateTo(localePath(PRO_LOGIN_PATH), { replace: true })
  }

  const expire = async (): Promise<void> => {
    await endSession()
    await navigateTo(expiredLoginRoute.value, { replace: true })
  }

  return { isAdmin, isExpiredAdmin, hasSession, expiredLoginRoute, endSession, leave, expire }
}
