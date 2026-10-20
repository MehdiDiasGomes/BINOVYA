import type { MailRedirectEnvironment } from '@/types/email'

import { loginEmailSchema } from '@/utils/accountValidation'

/**
 * Decides where every mail goes on the development server: to `NUXT_MAIL_REDIRECT_TO` when it is a
 * valid address, the server runs in development outside Vitest and mails go through Resend. The
 * outbox and the tests keep the real recipients, and a production build never redirects.
 * @param value - Value of `NUXT_MAIL_REDIRECT_TO`
 * @param environment - Development flag, `NODE_ENV` and resolved transport
 * @returns Redirect address, or null when mails go to their real recipient
 */
export const resolveMailRedirect = (
  value: unknown,
  environment: MailRedirectEnvironment,
): string | null => {
  if (!environment.isDev || environment.nodeEnv === 'test' || environment.transport !== 'resend') {
    return null
  }
  const parsed: ReturnType<typeof loginEmailSchema.safeParse> = loginEmailSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

/**
 * Prefixes a subject with the real recipient of a redirected mail, so it stays visible in the
 * shared mailbox.
 * @param subject - Original subject
 * @param recipient - Real recipient replaced by the redirect address
 * @returns Subject such as `[→ jane@example.com] Your booking`
 */
export const redirectedEmailSubject = (subject: string, recipient: string): string =>
  `[→ ${recipient}] ${subject}`
