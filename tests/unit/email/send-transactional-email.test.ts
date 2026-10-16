import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sendTransactionalEmail } from '../../../server/utils/mail'

import type { MailOutboxRecord } from '../../../app/types/email'

let dir = ''

type Config = Record<string, string>

const stubConfig = (overrides: Config = {}): void => {
  vi.stubGlobal('useRuntimeConfig', () => ({
    mailTransport: 'outbox',
    mailOutboxDir: dir,
    mailFrom: 'BINOVYA <test@binovya.test>',
    siteUrl: 'https://binovya.test',
    contactEmailTo: 'admin@binovya.test',
    resendApiKey: '',
    ...overrides,
  }))
}

const readRecords = async (): Promise<MailOutboxRecord[]> => {
  const names: string[] = (await readdir(dir)).filter(name => name.endsWith('.json')).sort()
  return Promise.all(
    names.map(
      async name => JSON.parse(await readFile(join(dir, name), 'utf8')) as MailOutboxRecord,
    ),
  )
}

const EMAIL = {
  to: 'ada@example.test',
  subject: 'Bonjour\nBcc: evil@example.test',
  html: '<html><head><style>p { color: red; }</style></head><body><p>Salut</p><!--binovya-footer-links--></body></html>',
  replyTo: 'admin@binovya.test',
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'binovya-send-'))
  stubConfig()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(async () => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  await rm(dir, { recursive: true, force: true })
})

describe('sendTransactionalEmail in outbox mode', () => {
  it('writes one record with the recipient, sender, reply-to and a sanitized subject', async () => {
    expect(await sendTransactionalEmail(EMAIL, 'Test email')).toBe(true)
    const [mail] = await readRecords()
    expect(mail).toMatchObject({
      to: 'ada@example.test',
      from: 'BINOVYA <test@binovya.test>',
      subject: 'Bonjour Bcc: evil@example.test',
      replyTo: 'admin@binovya.test',
      idempotencyKey: null,
      logLabel: 'Test email',
    })
    expect(mail?.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(new Date(mail?.sentAt ?? '').toISOString()).toBe(mail?.sentAt)
  })

  it('stores the HTML Resend would receive: styles inlined, footer links filled', async () => {
    await sendTransactionalEmail(EMAIL, 'Test email')
    const [mail] = await readRecords()
    expect(mail?.html).toContain('<p style="color: red;">Salut</p>')
    expect(mail?.html).not.toContain('<style')
    expect(mail?.html).not.toContain('<!--binovya-footer-links-->')
    expect(mail?.html).toContain('admin@binovya.test')
  })

  it('stores a null reply-to when none is given', async () => {
    await sendTransactionalEmail({ ...EMAIL, replyTo: undefined }, 'Test email')
    expect((await readRecords())[0]?.replyTo).toBeNull()
  })

  it('writes the idempotency key and does not write a second mail with it', async () => {
    const keyed = { ...EMAIL, idempotencyKey: 'booking-confirmation-1' }
    expect(await sendTransactionalEmail(keyed, 'Test email')).toBe(true)
    expect(await sendTransactionalEmail(keyed, 'Test email')).toBe(true)
    const records = await readRecords()
    expect(records).toHaveLength(1)
    expect(records[0]?.idempotencyKey).toBe('booking-confirmation-1')
  })

  it('does not need a Resend key', async () => {
    stubConfig({ resendApiKey: '' })
    expect(await sendTransactionalEmail(EMAIL, 'Test email')).toBe(true)
  })

  it('answers false and writes nothing when the directory is not writable', async () => {
    stubConfig({ mailOutboxDir: '/proc/binovya-no-such-dir/outbox' })
    expect(await sendTransactionalEmail(EMAIL, 'Test email')).toBe(false)
    expect(await readdir(dir)).toEqual([])
  })

  it('falls back to Resend outside development for an unknown value, so nothing is written', async () => {
    stubConfig({ mailTransport: 'Outbox', resendApiKey: '' })
    expect(await sendTransactionalEmail(EMAIL, 'Test email')).toBe(false)
    expect(await readdir(dir)).toEqual([])
  })
})

describe('sendTransactionalEmail with the outbox transport in production', () => {
  it('answers false and writes no file when NODE_ENV is production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(await sendTransactionalEmail(EMAIL, 'Test email')).toBe(false)
    expect(await readdir(dir)).toEqual([])
  })
})
