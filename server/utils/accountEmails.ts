import type { DeletionAlertData, LoginLink, LoginLinkTarget } from '@/types/account'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  generateDeletionRequestAlert,
  generateLoginLinkEmail,
} from '@/templates/email/accountEmails'

/**
 * Generates a login link for an existing customer and emails it to the profile address, with
 * BINOVYA as reply-to. Nothing is sent when the account email no longer matches the profile.
 * Never throws: a failure is only logged with the customer id.
 * @param client - Supabase client using the secret key
 * @param target - Identifier of the customer and locale of the confirm page
 * @returns True when Resend accepted the email
 */
export const sendLoginLinkEmail = async (
  client: SupabaseClient<Database>,
  target: LoginLinkTarget,
): Promise<boolean> => {
  const link: LoginLink | null = await createLoginLink(client, target)
  if (!link) {
    return false
  }
  return sendTransactionalEmail(
    {
      to: link.email,
      ...generateLoginLinkEmail({ firstName: link.firstName, loginUrl: link.url }, escapeHtml),
      replyTo: useRuntimeConfig().contactEmailTo || undefined,
    },
    `Login link email for ${target.customerId}`,
  )
}

/**
 * Alerts BINOVYA that a customer requested the deletion of their account, with the customer as
 * reply-to and the idempotency key `account-deletion-<id>-<request time>`, so a retry after a
 * cancelled request sends a new alert. Never throws.
 * @param customerId - Identifier of the customer, used for the idempotency key and the logs
 * @param data - Customer identity and request time
 * @returns True when Resend accepted the email
 */
export const sendDeletionRequestAlert = async (
  customerId: string,
  data: DeletionAlertData,
): Promise<boolean> => {
  const { contactEmailTo } = useRuntimeConfig()
  if (!contactEmailTo) {
    console.warn('Deletion request alert skipped: NUXT_CONTACT_EMAIL_TO is not set')
    return false
  }
  return sendTransactionalEmail(
    {
      to: contactEmailTo,
      ...generateDeletionRequestAlert(data, escapeHtml),
      replyTo: data.email,
      idempotencyKey: `account-deletion-${customerId}-${Date.parse(data.requestedAt)}`,
    },
    `Deletion request alert for ${customerId}`,
  )
}
