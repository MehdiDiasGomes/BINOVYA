import type { CustomerSessionState } from '@/types/account'

import { SESSION_EXPIRED_QUERY } from '@/constants/account'
import { PRO_HOME_PATH } from '@/constants/pro'

export default defineNuxtRouteMiddleware(async () => {
  const localePath = useLocalePath()
  const { status, endSession }: CustomerSessionState = useCustomerSession()
  if (status.value === 'active') {
    return
  }
  if (status.value === 'admin') {
    return navigateTo(localePath(PRO_HOME_PATH), { replace: true })
  }
  const isExpired: boolean = status.value === 'expired'
  if (isExpired) {
    await endSession()
  }
  return navigateTo(
    { path: localePath('/login'), query: isExpired ? { session: SESSION_EXPIRED_QUERY } : {} },
    { replace: true },
  )
})
