import type { LoginLink, LoginLinkTarget } from '@/types/account'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

type LoginProfile = {
  email: string
  firstName: string
}

const CONFIRM_PATH = '/account/confirm'

const normalizeEmail = (email: string | undefined): string => (email ?? '').trim().toLowerCase()

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
    const { data, error } = await client.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
    })
    const tokenHash: string | undefined = data.properties?.hashed_token
    if (error || !tokenHash) {
      console.error(`Login link generation failed for ${target.customerId}`, error?.code ?? '')
      return null
    }
    confirmUrl.hash = new URLSearchParams({ token_hash: tokenHash }).toString()
    return { url: confirmUrl.toString(), ...profile }
  } catch {
    console.error(`Login link generation failed for ${target.customerId}`)
    return null
  }
}
