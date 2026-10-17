import type { DeletionAlertData, LoginLink, LoginLinkTarget } from '@/types/account'
import type { BookingLocale } from '@/types/booking'
import type { Database } from '@/types/database.types'
import type { AdminLoginLink } from '@/types/pro'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  generateAdminLoginLinkEmail,
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
 * Generates a login link to the BINOVYA Pro area and emails it, in French, to the address of the
 * admin account. Nothing is sent when the account is no longer an admin. Never throws: a failure
 * is only logged with the account id.
 * @param client - Supabase client using the secret key
 * @param adminId - Identifier returned by `claim_admin_login_link`
 * @param locale - Locale of the confirm page
 * @returns True when Resend accepted the email
 */
export const sendAdminLoginLinkEmail = async (
  client: SupabaseClient<Database>,
  adminId: string,
  locale: BookingLocale,
): Promise<boolean> => {
  const link: AdminLoginLink | null = await createAdminLoginLink(client, adminId, locale)
  if (!link) {
    return false
  }
  return sendTransactionalEmail(
    { to: link.email, ...generateAdminLoginLinkEmail({ loginUrl: link.url }, escapeHtml) },
    `Admin login link email for ${adminId}`,
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
