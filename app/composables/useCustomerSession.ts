import type { CustomerSessionState, CustomerSessionStatus } from '@/types/account'
import type { AuthError, JwtPayload, Session, SupabaseClient } from '@supabase/supabase-js'

import { SESSION_EXPIRED_QUERY, SIGN_OUT_TIMEOUT_MS } from '@/constants/account'
import { PRO_HOME_PATH } from '@/constants/pro'
import { hasAdminRole } from '@/utils/adminSession'
import { isSignInExpired, readAccessTokenClaims } from '@/utils/customerSession'

const SIGN_OUT_TIMEOUT = Symbol('timeout')

/**
 * Tells whether a customer is logged in, from the Supabase session or the verified user claims.
 * A session older than the absolute lifetime counted from the login link is `expired`. A session
 * carrying the admin role is `admin`: customer pages send it to BINOVYA Pro and never end it, the
 * Pro area applies its own lifetime.
 * @returns Session status, an action ending the session and one sending the customer to the login
 * page with the session expired notice, or an admin to BINOVYA Pro
 */
export const useCustomerSession = (): CustomerSessionState => {
  const session: Ref<Omit<Session, 'user'> | null> = useSupabaseSession()
  const user: Ref<JwtPayload | null> = useSupabaseUser()
  const supabase: SupabaseClient = useSupabaseClient()
  const localePath = useLocalePath()

  const status: ComputedRef<CustomerSessionStatus> = computed(() => {
    if (session.value === null && user.value === null) {
      return 'none'
    }
    const claims: Pick<JwtPayload, 'amr' | 'app_metadata'> | null =
      user.value ?? readAccessTokenClaims(session.value?.access_token)
    if (hasAdminRole(claims)) {
      return 'admin'
    }
    return isSignInExpired(claims, Date.now() / 1000) ? 'expired' : 'active'
  })

  const isActive: ComputedRef<boolean> = computed(() => status.value === 'active')

  const signOutGlobally = async (): Promise<boolean> => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout: Promise<typeof SIGN_OUT_TIMEOUT> = new Promise(resolve => {
      timer = setTimeout(() => resolve(SIGN_OUT_TIMEOUT), SIGN_OUT_TIMEOUT_MS)
    })
    try {
      const result: { error: AuthError | null } | typeof SIGN_OUT_TIMEOUT = await Promise.race([
        supabase.auth.signOut({ scope: 'global' }),
        timeout,
      ])
      return result !== SIGN_OUT_TIMEOUT && result.error === null
    } catch {
      return false
    } finally {
      clearTimeout(timer)
    }
  }

  const endSession = async (): Promise<void> => {
    const isRevoked: boolean = await signOutGlobally()
    if (!isRevoked) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => null)
    }
    session.value = null
    user.value = null
  }

  const expireSession = async (): Promise<void> => {
    if (status.value === 'admin') {
      await navigateTo(localePath(PRO_HOME_PATH), { replace: true })
      return
    }
    await endSession()
    await navigateTo(
      { path: localePath('/login'), query: { session: SESSION_EXPIRED_QUERY } },
      { replace: true },
    )
  }

  return { status, isActive, endSession, expireSession }
}
