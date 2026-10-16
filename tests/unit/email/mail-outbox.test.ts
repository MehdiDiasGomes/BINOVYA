import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  isOutboxAllowed,
  outboxFileName,
  outboxKeyFileName,
  parseMailTransport,
  resolveMailTransport,
  resolveOutboxDir,
  writeOutboxRecord,
} from '../../../server/utils/mailOutbox'

import type { MailOutboxRecord } from '../../../app/types/email'

const record = (overrides: Partial<MailOutboxRecord> = {}): MailOutboxRecord => ({
  id: crypto.randomUUID(),
  to: 'ada@example.test',
  from: 'BINOVYA <contact@binovya.test>',
  subject: 'Sujet',
  html: '<p>Bonjour</p>',
  replyTo: null,
  idempotencyKey: null,
  logLabel: 'Test email',
  sentAt: '2026-10-16T08:30:00.123Z',
  ...overrides,
})

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'binovya-outbox-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('parseMailTransport', () => {
  it.each([
    [undefined, 'resend'],
    [null, 'resend'],
    ['', 'resend'],
    ['resend', 'resend'],
    ['outbox', 'outbox'],
  ])('reads %j as %s', (value, expected) => {
    expect(parseMailTransport(value)).toBe(expected)
  })

  it.each(['Outbox', 'outbox ', ' outbox', 'OUTBOX', 'smtp', 'resend ', 0, false])(
    'refuses %j as unknown',
    value => {
      expect(parseMailTransport(value)).toBeNull()
    },
  )
})

describe('resolveMailTransport', () => {
  it.each([
    [undefined, true, 'resend'],
    ['', true, 'resend'],
    ['resend', true, 'resend'],
    ['outbox', true, 'outbox'],
    ['Outbox', true, null],
    ['outbox ', true, null],
    ['smtp', true, null],
    [undefined, false, 'resend'],
    ['outbox', false, 'outbox'],
    ['Outbox', false, 'resend'],
    ['outbox ', false, 'resend'],
    ['smtp', false, 'resend'],
  ])('maps %j with isDev=%s to %s', (value, isDev, expected) => {
    expect(resolveMailTransport(value, isDev)).toBe(expected)
  })
})

describe('isOutboxAllowed', () => {
  it.each([
    [{ isDev: true, nodeEnv: 'development' }, true],
    [{ isDev: true, nodeEnv: undefined }, true],
    [{ isDev: false, nodeEnv: 'test' }, true],
    [{ isDev: false, nodeEnv: 'production' }, false],
    [{ isDev: false, nodeEnv: undefined }, false],
    [{ isDev: false, nodeEnv: 'Test' }, false],
  ])('answers for %j', (environment, expected) => {
    expect(isOutboxAllowed(environment)).toBe(expected)
  })
})

describe('resolveOutboxDir', () => {
  it('defaults to .mail-outbox under the root', () => {
    expect(resolveOutboxDir('', '/project')).toBe('/project/.mail-outbox')
  })

  it('resolves a relative directory against the root', () => {
    expect(resolveOutboxDir('tmp/mails', '/project')).toBe('/project/tmp/mails')
  })

  it('keeps an absolute directory', () => {
    expect(resolveOutboxDir('/var/mails', '/project')).toBe('/var/mails')
  })
})

describe('outboxFileName', () => {
  it('has no colon or dot in the timestamp and ends with the random part', () => {
    expect(outboxFileName(new Date('2026-10-16T08:30:00.123Z'), 'abc')).toBe(
      '2026-10-16T08-30-00-123Z-abc.json',
    )
  })

  it('sorts by sending time', () => {
    const early = outboxFileName(new Date('2026-10-16T08:30:00.123Z'), 'z')
    const late = outboxFileName(new Date('2026-10-16T08:30:00.124Z'), 'a')
    expect([late, early].sort()).toEqual([early, late])
  })
})

describe('outboxKeyFileName', () => {
  it('hashes the key to a stable 64 hex character name', () => {
    expect(outboxKeyFileName('booking-confirmation-1')).toMatch(/^[a-f0-9]{64}\.key$/)
    expect(outboxKeyFileName('booking-confirmation-1')).toBe(
      outboxKeyFileName('booking-confirmation-1'),
    )
  })

  it('differs for two keys and never contains the key', () => {
    expect(outboxKeyFileName('a')).not.toBe(outboxKeyFileName('b'))
    expect(outboxKeyFileName('../escape')).not.toContain('..')
  })
})

describe('writeOutboxRecord', () => {
  it('creates the directory and writes the record as JSON', async () => {
    const mail = record()
    const target = join(dir, 'nested')
    expect(await writeOutboxRecord(target, mail)).toBe(true)
    const [name] = await readdir(target)
    expect(name).toBe(outboxFileName(new Date(mail.sentAt), mail.id))
    expect(JSON.parse(await readFile(join(target, name ?? ''), 'utf8'))).toEqual(mail)
  })

  it('leaves no temporary file behind', async () => {
    await writeOutboxRecord(dir, record())
    expect((await readdir(dir)).filter(name => name.endsWith('.tmp'))).toEqual([])
  })

  it('writes two mails without key', async () => {
    await writeOutboxRecord(dir, record())
    await writeOutboxRecord(dir, record())
    expect((await readdir(dir)).filter(name => name.endsWith('.json'))).toHaveLength(2)
  })

  it('writes a second mail with the same idempotency key nowhere and still answers true', async () => {
    const first = record({ idempotencyKey: 'booking-confirmation-1' })
    const second = record({ idempotencyKey: 'booking-confirmation-1', subject: 'Autre' })
    expect(await writeOutboxRecord(dir, first)).toBe(true)
    expect(await writeOutboxRecord(dir, second)).toBe(true)
    const files = (await readdir(dir)).filter(name => name.endsWith('.json'))
    expect(files).toHaveLength(1)
    expect(JSON.parse(await readFile(join(dir, files[0] ?? ''), 'utf8')).subject).toBe('Sujet')
  })

  it('stores the key marker under .keys by hash', async () => {
    await writeOutboxRecord(dir, record({ idempotencyKey: 'k1' }))
    expect(await readdir(join(dir, '.keys'))).toEqual([outboxKeyFileName('k1')])
  })

  it('accepts two different keys', async () => {
    await writeOutboxRecord(dir, record({ idempotencyKey: 'k1' }))
    await writeOutboxRecord(dir, record({ idempotencyKey: 'k2' }))
    expect((await readdir(dir)).filter(name => name.endsWith('.json'))).toHaveLength(2)
  })

  it('releases the key when the write fails so a retry can send', async () => {
    const broken = record({ idempotencyKey: 'k3', sentAt: 'not a date' })
    await expect(writeOutboxRecord(dir, broken)).rejects.toThrow()
    expect(await writeOutboxRecord(dir, record({ idempotencyKey: 'k3' }))).toBe(true)
    expect((await readdir(dir)).filter(name => name.endsWith('.json'))).toHaveLength(1)
  })

  it('writes concurrent mails with the same key only once', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => writeOutboxRecord(dir, record({ idempotencyKey: 'race' }))),
    )
    expect(results).toEqual([true, true, true, true, true])
    expect((await readdir(dir)).filter(name => name.endsWith('.json'))).toHaveLength(1)
  })
})
