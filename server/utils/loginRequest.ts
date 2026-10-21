import type { LoginLinkRpc, LoginRequest, LoginResponse } from '@/types/account'
import type { BookingLocale } from '@/types/booking'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

import { serverSupabaseServiceRole } from '#supabase/server'
import { loginRequestSchema } from '@/utils/accountValidation'

type LoginLinkFlow = {
  rpc: LoginLinkRpc
  send: (
    client: SupabaseClient<Database>,
    accountId: string,
    locale: BookingLocale,
  ) => Promise<boolean>
}

const MAX_BODY_BYTES: number = 4 * 1024

const LOGIN_ACCEPTED: LoginResponse = { success: true }

const sendClaimedLink = async (
  client: SupabaseClient<Database>,
  flow: LoginLinkFlow,
  request: LoginRequest,
): Promise<void> => {
  const accountId: string | null = await claimLoginLink(client, flow.rpc, request.email)
  if (accountId) {
    await flow.send(client, accountId, request.locale)
  }
}

/**
 * Handles a login link request: 4 KB body validated by `loginRequestSchema`, the same
 * `{ success: true }` whether the address is known or not, the limit reached or the honeypot
 * filled. The link is reserved by the flow RPC and sent in the background through
 * `event.waitUntil`, after the response, so the response time only depends on the validation.
 * @param event - Incoming request
 * @param flow - Throttling RPC of the account kind and the function sending the link
 * @returns The identical acceptance response
 * @throws 400 when the body is invalid, 411 or 413 when its size is not acceptable
 */
export const handleLoginRequest = async (
  event: H3Event,
  flow: LoginLinkFlow,
): Promise<LoginResponse> => {
  assertBodySize(event, MAX_BODY_BYTES)
  const result: ReturnType<typeof loginRequestSchema.safeParse> = await readValidatedBody(
    event,
    body => loginRequestSchema.safeParse(body),
  )
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid login request' })
  }

  if (result.data.website) {
    return LOGIN_ACCEPTED
  }

  const client: SupabaseClient<Database> = serverSupabaseServiceRole<Database>(event)
  event.waitUntil(
    sendClaimedLink(client, flow, result.data).catch(() => {
      console.error(`Login link request failed in the background (${flow.rpc})`)
    }),
  )

  return LOGIN_ACCEPTED
}
