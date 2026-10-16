import { isOutboxAllowed, parseMailTransport } from '../utils/mailOutbox'

import type { MailTransport } from '@/types/email'

export default defineNitroPlugin(() => {
  if (isOutboxAllowed({ isDev: Boolean(import.meta.dev), nodeEnv: process.env.NODE_ENV })) {
    return
  }
  const transport: MailTransport | null = parseMailTransport(useRuntimeConfig().mailTransport)
  if (transport === 'outbox') {
    console.error(
      'NUXT_MAIL_TRANSPORT=outbox is refused outside development: no mail will be sent. Unset it to send through Resend.',
    )
  }
  if (transport === null) {
    console.error(
      'Unknown NUXT_MAIL_TRANSPORT: mails are sent through Resend. Unset it or set it to resend.',
    )
  }
})
