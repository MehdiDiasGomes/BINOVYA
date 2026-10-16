import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { signedAddress, THIONVILLE_ADDRESS } from '../../support/address'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { BASE_URL, adminMailbox, uniqueTestEmail } from '../../support/env'
import { htmlToText, normalizeSpaces, waitForOneMail } from '../../support/outbox'

const EMAIL = uniqueTestEmail('mail-quote')

const LAST_NAME = `<b>Lovelace</b>${crypto.randomUUID().slice(0, 8)}`

const COMMENT = 'Accès <img src=x onerror=alert(1)> par le portail "nord" & le parking'

const quotePayload = (): Record<string, unknown> => ({
  contact: {
    firstName: 'Ada',
    lastName: LAST_NAME,
    company: 'Mairie de Test',
    email: EMAIL,
    phone: '+33612345678',
  },
  address: signedAddress(THIONVILLE_ADDRESS),
  equipment: ['bins', 'pav'],
  smallBinCount: 2,
  largeBinCount: 1,
  plan: 'quarterly',
  comment: COMMENT,
  website: '',
})

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
})

afterAll(async () => {
  await cleanupE2eData()
})

describe('quote request mail', () => {
  it('reaches the BINOVYA mailbox with the visitor as reply-to, the request details and escaped text', async () => {
    const form = new FormData()
    form.append('payload', JSON.stringify(quotePayload()))
    const response = await fetch(`${BASE_URL}/api/quote`, { method: 'POST', body: form })
    expect(response.status).toBe(200)

    const mail = await waitForOneMail({
      to: adminMailbox(),
      subjectIncludes: `Demande de devis - ${LAST_NAME} Ada`,
    })
    expect(mail.replyTo).toBe(EMAIL)
    expect(mail.idempotencyKey).toBeNull()
    const text = normalizeSpaces(htmlToText(mail.html))
    expect(text).toContain(EMAIL)
    expect(text).toContain('Mairie de Test')
    expect(text).toContain('12 rue de la Gare, 57100 Thionville')
    expect(text).toContain("Bacs roulants, Points d'apport volontaire")
    expect(text).toContain('Fréquence souhaitée')
    expect(text).toContain('par le portail "nord" & le parking')
    expect(mail.html).not.toContain('<img')
    expect(mail.html).not.toContain('<b>Lovelace')
  })
})
