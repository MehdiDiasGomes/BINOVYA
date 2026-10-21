import { FetchError } from 'ofetch'

import type { ProAuthErrorHandlers } from '@/types/proPage'

import { isForbiddenOriginError } from '@/utils/fetchError'

/**
 * Sends the admin back to the Pro login when the server refuses a request: with the session
 * expired notice on 401, without it on 403 (the account is no longer an admin). A 403 caused by the
 * `Origin` header is not an authentication error and is left to the caller.
 * @returns Handlers for a status code or for an error thrown by `$fetch`, resolving to true when
 * the error was an authentication error and was handled
 */
export const useProAuthError = (): ProAuthErrorHandlers => {
  const { leave, expire } = useAdminSession()

  const handleAuthStatus = async (statusCode: number | undefined): Promise<boolean> => {
    if (statusCode === 401) {
      await expire()
      return true
    }
    if (statusCode === 403) {
      await leave()
      return true
    }
    return false
  }

  const handleAuthError = async (error: unknown): Promise<boolean> =>
    !isForbiddenOriginError(error) &&
    (await handleAuthStatus(error instanceof FetchError ? error.statusCode : undefined))

  return { handleAuthStatus, handleAuthError }
}
