import { describe, expect, it } from 'vitest'

import { postJson } from './support/api'

const VALID_CONTACT = {
  firstName: 'Int',
  lastName: 'Test',
  company: '',
  email: 'delivered+e2e-contact@resend.dev',
  phone: '+33612345678',
  subject: 'info',
  message: 'Message de test automatique, merci de ne pas répondre.',
  website: '',
}

describe('POST /api/contact', () => {
  it('rejects an empty body with 400', async () => {
    expect((await postJson('/api/contact', {})).status).toBe(400)
  })

  it('rejects an invalid email with 400', async () => {
    const result = await postJson('/api/contact', { ...VALID_CONTACT, email: 'not-an-email' })
    expect(result.status).toBe(400)
  })

  it('rejects a body above 16 KiB with 413', async () => {
    const result = await postJson('/api/contact', {
      ...VALID_CONTACT,
      message: 'x'.repeat(20 * 1024),
    })
    expect(result.status).toBe(413)
  })

  it('answers success without sending when the honeypot is filled', async () => {
    const result = await postJson('/api/contact', {
      ...VALID_CONTACT,
      website: 'https://spam.test',
    })
    expect(result.status).toBe(200)
    expect(result.body).toEqual({ success: true })
  })

  it('answers 200 when Resend accepts the notification', async () => {
    const result = await postJson('/api/contact', VALID_CONTACT)
    expect(result.status).toBe(200)
    expect(result.body).toEqual({ success: true })
  })
})
