import { createHash, randomUUID } from 'node:crypto'
import { link, mkdir, unlink, writeFile } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'

import type { MailOutboxRecord, MailTransport, MailTransportEnvironment } from '@/types/email'

type KeyReservation = { isDuplicate: true } | { isDuplicate: false; keyPath: string | null }

const DEFAULT_OUTBOX_DIR = '.mail-outbox'

const KEYS_DIR = '.keys'

const isFileExistsError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST'

/**
 * Reads the mail transport from the configuration. An empty value means Resend.
 * @param value - Value of `NUXT_MAIL_TRANSPORT`
 * @returns Transport, or null when the value is unknown
 */
export const parseMailTransport = (value: unknown): MailTransport | null => {
  if (value === undefined || value === null || value === '' || value === 'resend') {
    return 'resend'
  }
  return value === 'outbox' ? 'outbox' : null
}

/**
 * Decides the mail transport. An unknown value is refused on the development server, where it is
 * most likely a typo of `outbox` that would send real mails, and falls back to Resend elsewhere so
 * production mails keep going out.
 * @param value - Value of `NUXT_MAIL_TRANSPORT`, compared exactly, without trimming
 * @param isDev - True on the development server
 * @returns Transport, or null when sending must be refused
 */
export const resolveMailTransport = (value: unknown, isDev: boolean): MailTransport | null =>
  parseMailTransport(value) ?? (isDev ? null : 'resend')

/**
 * Tells whether mails may be written to the local outbox instead of being sent: only on the
 * development server, used by the integration and end-to-end tests, or under Vitest. A production
 * build inlines `NODE_ENV` as `production`, so it can never use the outbox.
 * @param environment - Development flag of the server and `NODE_ENV`
 * @returns True when the outbox transport is allowed
 */
export const isOutboxAllowed = (environment: MailTransportEnvironment): boolean =>
  environment.isDev || environment.nodeEnv === 'test'

/**
 * Resolves the outbox directory against the project root, the working directory of the server.
 * @param configuredDir - Value of `NUXT_MAIL_OUTBOX_DIR`, empty for the default `.mail-outbox`
 * @param rootDir - Directory relative paths are resolved from
 * @returns Absolute directory path
 */
export const resolveOutboxDir = (configuredDir: string, rootDir: string): string => {
  const dir: string = configuredDir || DEFAULT_OUTBOX_DIR
  return isAbsolute(dir) ? dir : resolve(rootDir, dir)
}

/**
 * Names an outbox file so that files sort by sending time and never collide.
 * @param sentAt - Sending time
 * @param randomPart - Random suffix, such as a UUID
 * @returns File name such as `2026-10-16T08-30-00-123Z-<random>.json`
 */
export const outboxFileName = (sentAt: Date, randomPart: string): string =>
  `${sentAt.toISOString().replace(/[:.]/g, '-')}-${randomPart}.json`

/**
 * Names the marker file that reserves an idempotency key in the outbox.
 * @param idempotencyKey - Idempotency key of the mail
 * @returns File name derived from a SHA-256 hash of the key
 */
export const outboxKeyFileName = (idempotencyKey: string): string =>
  `${createHash('sha256').update(idempotencyKey).digest('hex')}.key`

const reserveKey = async (dir: string, idempotencyKey: string | null): Promise<KeyReservation> => {
  if (!idempotencyKey) {
    return { isDuplicate: false, keyPath: null }
  }
  const keyPath: string = join(dir, KEYS_DIR, outboxKeyFileName(idempotencyKey))
  await mkdir(join(dir, KEYS_DIR), { recursive: true })
  try {
    await writeFile(keyPath, idempotencyKey, { flag: 'wx' })
  } catch (error) {
    if (isFileExistsError(error)) {
      return { isDuplicate: true }
    }
    throw error
  }
  return { isDuplicate: false, keyPath }
}

const writeAtomically = async (filePath: string, content: string): Promise<void> => {
  const tempPath: string = `${filePath}.${randomUUID()}.tmp`
  await writeFile(tempPath, content)
  try {
    await link(tempPath, filePath)
  } finally {
    await unlink(tempPath).catch(() => undefined)
  }
}

/**
 * Writes a mail as one JSON file in the outbox directory, atomically. Like Resend, a second mail
 * with an idempotency key already written is not written again and counts as sent.
 * @param dir - Absolute outbox directory, created when missing
 * @param record - Mail exactly as it would be sent
 * @returns True when the mail is in the outbox, also when its idempotency key was already used
 * @throws When the directory or the file cannot be written
 */
export const writeOutboxRecord = async (
  dir: string,
  record: MailOutboxRecord,
): Promise<boolean> => {
  await mkdir(dir, { recursive: true })
  const reservation: KeyReservation = await reserveKey(dir, record.idempotencyKey)
  if (reservation.isDuplicate) {
    return true
  }
  try {
    await writeAtomically(
      join(dir, outboxFileName(new Date(record.sentAt), record.id)),
      JSON.stringify(record, null, 2),
    )
    return true
  } catch (error) {
    if (reservation.keyPath) {
      await unlink(reservation.keyPath).catch(() => undefined)
    }
    throw error
  }
}
