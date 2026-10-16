import type { CustomerSessionState } from '@/types/account'

import { SESSION_EXPIRED_QUERY } from '@/constants/account'

export default defineNuxtRouteMiddleware(async () => {
  const localePath = useLocalePath()
  const { status, endSession }: CustomerSessionState = useCustomerSession()
  if (status.value === 'active') {
    return
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
