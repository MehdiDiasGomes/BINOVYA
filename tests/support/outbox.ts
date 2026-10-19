import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { TEST_OUTBOX_DIR } from '../../scripts/test-outbox'
import { sleep } from '../../scripts/test-process'
import { resolveOutboxDir } from '../../server/utils/mailOutbox'

import type { MailOutboxRecord } from '../../app/types/email'

export type MailQuery = {
  to: string
  subjectIncludes?: string
  since?: Date
}

const POLL_MS = 200

const DEFAULT_TIMEOUT_MS = 10_000

/**
 * Returns the absolute directory the test server writes its mails to.
 * @returns Outbox directory, the one the test runner exports in `NUXT_MAIL_OUTBOX_DIR`
 */
export const outboxDirectory = (): string =>
  resolveOutboxDir(process.env.NUXT_MAIL_OUTBOX_DIR || TEST_OUTBOX_DIR, process.cwd())

const readRecord = async (name: string): Promise<MailOutboxRecord | null> => {
  try {
    return JSON.parse(await readFile(join(outboxDirectory(), name), 'utf8')) as MailOutboxRecord
  } catch {
    return null
  }
}

/**
 * Reads every mail the test server wrote, oldest first.
 * @returns Mail records
 */
export const listMails = async (): Promise<MailOutboxRecord[]> => {
  const names: string[] = await readdir(outboxDirectory()).catch(() => [])
  const records: (MailOutboxRecord | null)[] = await Promise.all(
    names.filter(name => name.endsWith('.json')).map(readRecord),
  )
  return records
    .filter((record): record is MailOutboxRecord => record !== null)
    .sort((first, second) => first.sentAt.localeCompare(second.sentAt))
}

const matches = (record: MailOutboxRecord, query: MailQuery): boolean =>
  record.to.toLowerCase() === query.to.toLowerCase() &&
  record.subject.includes(query.subjectIncludes ?? '') &&
  (query.since === undefined || new Date(record.sentAt).getTime() >= query.since.getTime())

/**
 * Polls the outbox until at least one mail matches, since the server writes asynchronously.
 * @param query - Exact recipient, part of the subject and optional earliest sending time
 * @param timeoutMs - Maximum wait
 * @returns Matching mails, empty when none appeared in time
 */
export const waitForMails = async (
  query: MailQuery,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<MailOutboxRecord[]> => {
  const deadline: number = Date.now() + timeoutMs
  let found: MailOutboxRecord[] = []
  while (found.length === 0 && Date.now() < deadline) {
    found = (await listMails()).filter(record => matches(record, query))
    if (found.length === 0) {
      await sleep(POLL_MS)
    }
  }
  return found
}

/**
 * Polls the outbox until at least `count` mails match.
 * @param query - Exact recipient, part of the subject and optional earliest sending time
 * @param count - Number of mails to wait for
 * @param timeoutMs - Maximum wait
 * @returns Matching mails, possibly fewer than `count` when time ran out
 */
export const waitForMailCount = async (
  query: MailQuery,
  count: number,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<MailOutboxRecord[]> => {
  const deadline: number = Date.now() + timeoutMs
  let found: MailOutboxRecord[] = (await listMails()).filter(record => matches(record, query))
  while (found.length < count && Date.now() < deadline) {
    await sleep(POLL_MS)
    found = (await listMails()).filter(record => matches(record, query))
  }
  return found
}

/**
 * Waits for exactly one matching mail and returns it.
 * @param query - Exact recipient, part of the subject and optional earliest sending time
 * @returns The single matching mail
 * @throws When no mail or several mails match
 */
export const waitForOneMail = async (query: MailQuery): Promise<MailOutboxRecord> => {
  const found: MailOutboxRecord[] = await waitForMails(query)
  if (found.length !== 1 || !found[0]) {
    throw new Error(`Expected one mail to ${query.to}, found ${found.length}`)
  }
  return found[0]
}

/**
 * Lists the mails of a recipient after a short settling delay, to prove that nothing was sent.
 * @param query - Recipient, optional subject part and earliest time
 * @param settleMs - How long the server may still write
 * @returns Matching mails
 */
export const mailsAfterSettling = async (
  query: MailQuery,
  settleMs: number = 1500,
): Promise<MailOutboxRecord[]> => {
  await sleep(settleMs)
  return (await listMails()).filter(record => matches(record, query))
}

/**
 * Extracts the href of the first link whose address contains a text, HTML entities decoded.
 * @param html - HTML of a mail
 * @param part - Text the address must contain
 * @returns Address, or undefined when there is no such link
 */
export const findLink = (html: string, part: string): string | undefined => {
  const hrefs: string[] = [...html.matchAll(/href="([^"]*)"/g)].map(match => match[1] ?? '')
  return hrefs.find(href => href.includes(part))?.replaceAll('&amp;', '&')
}

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#123;': '{',
  '&#125;': '}',
  '&nbsp;': ' ',
}

const withoutStyleBlocks = (html: string): string => {
  const start: number = html.indexOf('<style')
  const end: number = html.indexOf('</style>', start)
  return start === -1 || end === -1
    ? html
    : withoutStyleBlocks(`${html.slice(0, start)} ${html.slice(end + '</style>'.length)}`)
}

const withoutTags = (html: string): string => {
  const start: number = html.indexOf('<')
  const end: number = html.indexOf('>', start)
  return start === -1 || end === -1
    ? html
    : withoutTags(`${html.slice(0, start)} ${html.slice(end + 1)}`)
}

/**
 * Turns the HTML of a mail into the text a reader sees: tags and styles removed, entities
 * decoded, every kind of space collapsed to one regular space.
 * @param html - HTML of a mail
 * @returns Plain text
 */
export const htmlToText = (html: string): string =>
  withoutTags(withoutStyleBlocks(html))
    .replace(/&(?:amp|lt|gt|quot|#39|#123|#125|nbsp);/g, entity => HTML_ENTITIES[entity] ?? entity)
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Normalizes spaces, such as the no-break spaces of a formatted price, to compare with a text.
 * @param text - Text to normalize
 * @returns Text with regular single spaces
 */
export const normalizeSpaces = (text: string): string => text.replace(/\s+/g, ' ')
