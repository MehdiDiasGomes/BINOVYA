import type { AdminSessionState } from '@/types/pro'

import { PRO_HOME_PATH } from '@/constants/pro'

export default defineNuxtRouteMiddleware(async () => {
  const localePath = useLocalePath()
  const { isAdmin, isExpiredAdmin, endSession }: AdminSessionState = useAdminSession()
  if (isAdmin.value) {
    return navigateTo(localePath(PRO_HOME_PATH), { replace: true })
  }
  if (isExpiredAdmin.value) {
    await endSession()
  }
})
