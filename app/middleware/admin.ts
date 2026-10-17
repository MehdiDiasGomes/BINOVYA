import type { AdminSessionState } from '@/types/pro'

import { PRO_ACCESS_DENIED_QUERY, PRO_LOGIN_PATH } from '@/constants/pro'

export default defineNuxtRouteMiddleware(async () => {
  const localePath = useLocalePath()
  const { isAdmin, isExpiredAdmin, hasSession, expiredLoginRoute, endSession }: AdminSessionState =
    useAdminSession()
  if (isAdmin.value) {
    return
  }
  if (isExpiredAdmin.value) {
    await endSession()
    return navigateTo(expiredLoginRoute.value, { replace: true })
  }
  return navigateTo(
    {
      path: localePath(PRO_LOGIN_PATH),
      query: hasSession.value ? { access: PRO_ACCESS_DENIED_QUERY } : {},
    },
    { replace: true },
  )
})
