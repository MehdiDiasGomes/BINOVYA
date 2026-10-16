import { describe, expect, it } from 'vitest'

import { postJson } from '../../support/api'
import { adminMailbox, uniqueTestEmail } from '../../support/env'
import { htmlToText, normalizeSpaces, waitForOneMail } from '../../support/outbox'

const SENDER = uniqueTestEmail('mail-contact')

const LAST_NAME = `<b>Lovelace</b>${crypto.randomUUID().slice(0, 8)}`

const MESSAGE = 'Bonjour <script>alert(1)</script> & "merci"\nDeuxième ligne'

describe('contact form mail', () => {
  it('reaches the BINOVYA mailbox with the visitor as reply-to, details and escaped message', async () => {
    const result = await postJson('/api/contact', {
      firstName: 'Ada',
      lastName: LAST_NAME,
      company: 'Mairie de Test',
      email: SENDER,
      phone: '+33612345678',
      subject: 'meeting',
      message: MESSAGE,
      website: '',
    })
    expect(result.status).toBe(200)

    const mail = await waitForOneMail({
      to: adminMailbox(),
      subjectIncludes: `${LAST_NAME} Ada`,
    })
    expect(mail.subject).toBe(`Nouveau contact : Demande de rendez-vous - ${LAST_NAME} Ada`)
    expect(mail.replyTo).toBe(SENDER)
    expect(mail.idempotencyKey).toBeNull()
    const text = normalizeSpaces(htmlToText(mail.html))
    expect(text).toContain(SENDER)
    expect(text).toContain('+33612345678')
    expect(text).toContain('Mairie de Test')
    expect(text).toContain('Demande de rendez-vous')
    expect(text).toContain('Bonjour <script>alert(1)</script> & "merci"')
    expect(mail.html).not.toContain('<script')
    expect(mail.html).not.toContain('<b>Lovelace')
  })
})
