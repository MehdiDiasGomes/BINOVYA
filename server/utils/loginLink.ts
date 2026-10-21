import { normalizeEmail } from './emailAddress'

import type { LoginLink, LoginLinkRpc, LoginLinkTarget } from '@/types/account'
import type { BookingLocale } from '@/types/booking'
import type { Database } from '@/types/database.types'
import type { AdminLoginLink } from '@/types/pro'
import type { SupabaseClient } from '@supabase/supabase-js'

import { PRO_CONFIRM_PATH } from '@/constants/pro'
import { hasAdminRole } from '@/utils/adminSession'

type LoginProfile = {
  email: string
  firstName: string
}

type MagicLinkRequest = {
  userId: string
  email: string
  confirmUrl: URL
}

const CONFIRM_PATH = '/account/confirm'

const loadVerifiedProfile = async (
  client: SupabaseClient<Database>,
  customerId: string,
): Promise<LoginProfile | null> => {
  const { data: profile } = await client
    .from('profiles')
    .select('email, first_name')
    .eq('id', customerId)
    .maybeSingle()
  const { data: auth, error } = await client.auth.admin.getUserById(customerId)
  if (error) {
    console.error(`Login link skipped for ${customerId}: auth user lookup failed`, error.code ?? '')
    return null
  }
  const profileEmail: string = normalizeEmail(profile?.email)
  if (!profile || profileEmail.length === 0 || normalizeEmail(auth.user?.email) !== profileEmail) {
    console.error(`Login link skipped for ${customerId}: account and profile emails differ`)
    return null
  }
  return { email: profileEmail, firstName: profile.first_name }
}

const loadAdminEmail = async (
  client: SupabaseClient<Database>,
  adminId: string,
): Promise<string | null> => {
  const { data: auth, error } = await client.auth.admin.getUserById(adminId)
  if (error) {
    console.error(
      `Admin login link skipped for ${adminId}: auth user lookup failed`,
      error.code ?? '',
    )
    return null
  }
  const email: string = normalizeEmail(auth.user?.email)
  if (!hasAdminRole(auth.user) || email.length === 0) {
    console.error(`Admin login link skipped for ${adminId}: not an admin account`)
    return null
  }
  return email
}

const generateMagicLink = async (
  client: SupabaseClient<Database>,
  request: MagicLinkRequest,
): Promise<string | null> => {
  const { data, error } = await client.auth.admin.generateLink({
    type: 'magiclink',
    email: request.email,
  })
  const tokenHash: string | undefined = data.properties?.hashed_token
  if (error || !tokenHash) {
    console.error(`Login link generation failed for ${request.userId}`, error?.code ?? '')
    return null
  }
  request.confirmUrl.hash = new URLSearchParams({ token_hash: tokenHash }).toString()
  return request.confirmUrl.toString()
}

/**
 * Reserves the sending of a login link through a throttling RPC, which answers null for an
 * unknown address or when the limit is reached, without saying which.
 * @param client - Supabase client using the secret key
 * @param rpc - `claim_login_link` for a customer, `claim_admin_login_link` for an admin
 * @param email - Address typed on the login page, normalized
 * @returns Identifier of the account the link may be sent to, or null
 */
export const claimLoginLink = async (
  client: SupabaseClient<Database>,
  rpc: LoginLinkRpc,
  email: string,
): Promise<string | null> => {
  const { data, error } = await client.rpc(rpc, { p_email: email })
  if (error) {
    console.error('Login link claim failed', error.code ?? '')
    return null
  }
  return data
}

/**
 * Generates a one-time login link to the customer area, only when the Supabase account still has
 * the email of the profile, so Supabase never creates an account. The token travels in the URL
 * fragment of the site confirm page, never sent to a server, and is verified in the browser. The
 * link lifetime is the Supabase Email OTP Expiration setting. Never throws.
 * @param client - Supabase client using the secret key
 * @param target - Identifier of an existing customer and locale of the confirm page
 * @returns Login link with the recipient email and first name, or null when not generated
 */
export const createLoginLink = async (
  client: SupabaseClient<Database>,
  target: LoginLinkTarget,
): Promise<LoginLink | null> => {
  try {
    const confirmUrl: URL = new URL(localizedSiteUrl(target.locale, CONFIRM_PATH))
    const profile: LoginProfile | null = await loadVerifiedProfile(client, target.customerId)
    if (!profile) {
      return null
    }
    const url: string | null = await generateMagicLink(client, {
      userId: target.customerId,
      email: profile.email,
      confirmUrl,
    })
    return url ? { url, ...profile } : null
  } catch {
    console.error(`Login link generation failed for ${target.customerId}`)
    return null
  }
}

/**
 * Generates a one-time login link to the BINOVYA Pro area for an account already returned by
 * `claim_admin_login_link`. The link is built for the email of the existing Supabase account, and
 * only when its `app_metadata.role` is still admin, so Supabase never creates an account. Same
 * fragment-only token as the customer link, on the `/pro/confirm` page. Never throws.
 * @param client - Supabase client using the secret key
 * @param adminId - Identifier of the admin account
 * @param locale - Locale of the confirm page
 * @returns Login link with the recipient email, or null when not generated
 */
export const createAdminLoginLink = async (
  client: SupabaseClient<Database>,
  adminId: string,
  locale: BookingLocale,
): Promise<AdminLoginLink | null> => {
  try {
    const confirmUrl: URL = new URL(localizedSiteUrl(locale, PRO_CONFIRM_PATH))
    const email: string | null = await loadAdminEmail(client, adminId)
    if (!email) {
      return null
    }
    const url: string | null = await generateMagicLink(client, {
      userId: adminId,
      email,
      confirmUrl,
    })
    return url ? { url, email } : null
  } catch {
    console.error(`Admin login link generation failed for ${adminId}`)
    return null
  }
}
