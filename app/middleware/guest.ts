import type { CustomerSessionState } from '@/types/account'

export default defineNuxtRouteMiddleware(async () => {
  const localePath = useLocalePath()
  const { status, endSession }: CustomerSessionState = useCustomerSession()
  if (status.value === 'expired') {
    await endSession()
    return
  }
  if (status.value === 'active') {
    return navigateTo(localePath('/account'), { replace: true })
  }
})
