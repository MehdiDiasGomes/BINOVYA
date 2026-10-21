import { isOutboxAllowed, parseMailTransport } from '../utils/mailOutbox'

import type { MailTransport } from '@/types/email'

const checkMailTransport = (): void => {
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
}

const checkMailRedirect = (): void => {
  if (import.meta.dev || !useRuntimeConfig().mailRedirectTo) {
    return
  }
  console.error(
    'NUXT_MAIL_REDIRECT_TO is ignored outside development: mails go to their real recipients. Unset it.',
  )
}

export default defineNitroPlugin(() => {
  checkMailTransport()
  checkMailRedirect()
})
