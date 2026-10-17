import type { CustomerSessionState } from '@/types/account'

import { PRO_HOME_PATH } from '@/constants/pro'

export default defineNuxtRouteMiddleware(async () => {
  const localePath = useLocalePath()
  const { status, endSession }: CustomerSessionState = useCustomerSession()
  if (status.value === 'admin') {
    return navigateTo(localePath(PRO_HOME_PATH), { replace: true })
  }
  if (status.value === 'expired') {
    await endSession()
    return
  }
  if (status.value === 'active') {
    return navigateTo(localePath('/account'), { replace: true })
  }
})
