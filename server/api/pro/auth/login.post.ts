import type { LoginResponse } from '@/types/account'

export default defineEventHandler(
  (event): Promise<LoginResponse> =>
    handleLoginRequest(event, { rpc: 'claim_admin_login_link', send: sendAdminLoginLinkEmail }),
)
