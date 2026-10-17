import type { LoginResponse } from '@/types/account'

export default defineEventHandler(
  (event): Promise<LoginResponse> =>
    handleLoginRequest(event, {
      rpc: 'claim_login_link',
      send: (client, customerId, locale) => sendLoginLinkEmail(client, { customerId, locale }),
    }),
)
