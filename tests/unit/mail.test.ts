import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { escapeHtml, sanitizeEmailSubject, sendTransactionalEmail } from '../../server/utils/mail'

type SendResult = { error: { name: string } | null }

const sendMock = vi.hoisted(() => vi.fn())

vi.mock('resend', () => ({
  Resend: class {
    public emails: { send: typeof sendMock } = { send: sendMock }
  },
}))

const configMock = vi.fn()

const EMAIL = { to: 'delivered@resend.dev', subject: 'Sujet', html: '<p>x</p>' }

beforeEach(() => {
  configMock.mockReturnValue({ resendApiKey: 're_test', mailFrom: '' })
  vi.stubGlobal('useRuntimeConfig', configMock)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  sendMock.mockReset()
})

describe('sanitizeEmailSubject', () => {
  it('keeps a plain subject unchanged', () => {
    expect(sanitizeEmailSubject('Rappel : passage BINOVYA le lundi 19 octobre 2026')).toBe(
      'Rappel : passage BINOVYA le lundi 19 octobre 2026',
    )
  })

  it('replaces line breaks so a header cannot be injected', () => {
    const result = sanitizeEmailSubject('Sujet\r\nBcc: attacker@example.com')
    expect(result).not.toMatch(/[\r\n]/)
    expect(result).toBe('Sujet  Bcc: attacker@example.com')
  })

  it('replaces tabs and null bytes', () => {
    expect(sanitizeEmailSubject('a\tb\u0000c')).toBe('a b c')
  })

  it('keeps accents and symbols', () => {
    expect(sanitizeEmailSubject('Réservation payée - 19,90 €')).toBe('Réservation payée - 19,90 €')
  })
})

describe('escapeHtml', () => {
  it('escapes tags, quotes and ampersands', () => {
    expect(escapeHtml(`<script>"a" & 'b'</script>`)).toBe(
      '&lt;script&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/script&gt;',
    )
  })

  it('escapes template braces', () => {
    expect(escapeHtml('{{a}} {b}')).toBe('&#123;&#123;a&#125;&#125; &#123;b&#125;')
  })
})

describe('sendTransactionalEmail', () => {
  it('returns true when Resend accepts the email', async () => {
    sendMock.mockResolvedValue({ error: null } satisfies SendResult)
    expect(await sendTransactionalEmail(EMAIL, 'label')).toBe(true)
  })

  it('uses the default sender when NUXT_MAIL_FROM is empty', async () => {
    sendMock.mockResolvedValue({ error: null } satisfies SendResult)
    await sendTransactionalEmail(EMAIL, 'label')
    expect(sendMock.mock.calls[0]?.[0].from).toBe('BINOVYA <contact@dg-zenith.com>')
  })

  it('uses NUXT_MAIL_FROM when set', async () => {
    configMock.mockReturnValue({ resendApiKey: 're_test', mailFrom: 'BINOVYA <a@b.test>' })
    sendMock.mockResolvedValue({ error: null } satisfies SendResult)
    await sendTransactionalEmail(EMAIL, 'label')
    expect(sendMock.mock.calls[0]?.[0].from).toBe('BINOVYA <a@b.test>')
  })

  it('passes the idempotency key to Resend', async () => {
    sendMock.mockResolvedValue({ error: null } satisfies SendResult)
    await sendTransactionalEmail({ ...EMAIL, idempotencyKey: 'booking-confirmation-1' }, 'label')
    expect(sendMock.mock.calls[0]?.[1]).toEqual({ idempotencyKey: 'booking-confirmation-1' })
  })

  it('sanitizes the subject before sending', async () => {
    sendMock.mockResolvedValue({ error: null } satisfies SendResult)
    await sendTransactionalEmail({ ...EMAIL, subject: 'a\nb' }, 'label')
    expect(sendMock.mock.calls[0]?.[0].subject).toBe('a b')
  })

  it('returns false without calling Resend when the API key is missing', async () => {
    configMock.mockReturnValue({ resendApiKey: '', mailFrom: '' })
    expect(await sendTransactionalEmail(EMAIL, 'label')).toBe(false)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('returns false when Resend answers an error', async () => {
    sendMock.mockResolvedValue({ error: { name: 'validation_error' } } satisfies SendResult)
    expect(await sendTransactionalEmail(EMAIL, 'label')).toBe(false)
  })

  it('returns false and does not throw when Resend rejects', async () => {
    sendMock.mockRejectedValue(new Error('network down'))
    await expect(sendTransactionalEmail(EMAIL, 'label')).resolves.toBe(false)
  })

  it('gives up after 5 seconds', async () => {
    vi.useFakeTimers()
    sendMock.mockReturnValue(new Promise(() => undefined))
    const pending = sendTransactionalEmail(EMAIL, 'label')
    await vi.advanceTimersByTimeAsync(5000)
    expect(await pending).toBe(false)
  })

  it('does not log the recipient or the Resend error details', async () => {
    sendMock.mockResolvedValue({ error: { name: 'validation_error' } } satisfies SendResult)
    await sendTransactionalEmail(EMAIL, 'label')
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('resend.dev')
  })
})
