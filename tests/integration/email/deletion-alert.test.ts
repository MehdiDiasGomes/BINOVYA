import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createCustomer,
  openSession,
  sessionCookie,
  type AccountCustomer,
} from '../../support/account'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { BASE_URL, ORIGIN, adminMailbox, uniqueTestEmail } from '../../support/env'
import { htmlToText, normalizeSpaces, waitForOneMail } from '../../support/outbox'

import type { MailOutboxRecord } from '../../../app/types/email'

const FIRST_NAME = `<script>alert(1)</script>Ada${crypto.randomUUID().slice(0, 8)}`

let customer: AccountCustomer
let alert: MailOutboxRecord
let requestedAt = ''

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  customer = await createCustomer({
    email: uniqueTestEmail('mail-deletion'),
    firstName: FIRST_NAME,
  })
  const session = await openSession(customer.email)
  const response = await fetch(`${BASE_URL}/api/account/deletion-request`, {
    method: 'POST',
    headers: { Cookie: sessionCookie(session.raw), Origin: ORIGIN },
  })
  expect(response.status).toBe(200)
  requestedAt = ((await response.json()) as { requestedAt: string }).requestedAt
  alert = await waitForOneMail({
    to: adminMailbox(),
    subjectIncludes: `Compte ${FIRST_NAME}`,
  })
})

afterAll(async () => {
  await cleanupE2eData()
})

describe('account deletion alert mail', () => {
  it('goes to the BINOVYA mailbox with the customer as reply-to and a per-request key', () => {
    expect(alert.to).toBe(adminMailbox())
    expect(alert.replyTo).toBe(customer.email)
    expect(alert.idempotencyKey).toBe(`account-deletion-${customer.id}-${Date.parse(requestedAt)}`)
  })

  it('names the customer in the subject', () => {
    expect(alert.subject).toBe(`Demande de suppression de compte - Compte ${FIRST_NAME}`)
  })

  it('gives the identity, the one month delay and the request date', () => {
    const text = normalizeSpaces(htmlToText(alert.html))
    expect(text).toContain(customer.email)
    expect(text).toContain('+33612345678')
    expect(text).toContain('À traiter sous un mois')
    expect(text).toContain('Demande reçue le')
  })

  it('escapes the first name', () => {
    expect(alert.html).not.toContain('<script')
    expect(alert.html).toContain('&lt;script&gt;')
  })
})
