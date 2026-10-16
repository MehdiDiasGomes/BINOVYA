import type { CustomerSessionState, CustomerSessionStatus } from '@/types/account'
import type { AuthError, JwtPayload, Session, SupabaseClient } from '@supabase/supabase-js'

import { SESSION_EXPIRED_QUERY, SIGN_OUT_TIMEOUT_MS } from '@/constants/account'
import { isSignInExpired, readAccessTokenClaims } from '@/utils/customerSession'

const SIGN_OUT_TIMEOUT = Symbol('timeout')

/**
 * Tells whether a customer is logged in, from the Supabase session or the verified user claims.
 * A session older than the absolute lifetime counted from the login link is `expired`.
 * @returns Session status, an action ending the session and one sending the customer to the login
 * page with the session expired notice
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
    const claims: Pick<JwtPayload, 'amr'> | null =
      user.value ?? readAccessTokenClaims(session.value?.access_token)
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
    await endSession()
    await navigateTo(
      { path: localePath('/login'), query: { session: SESSION_EXPIRED_QUERY } },
      { replace: true },
    )
  }

  return { status, isActive, endSession, expireSession }
}
