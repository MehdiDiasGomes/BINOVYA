import { existsSync, readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { parseEnv } from 'node:util'

const ADMIN_MAILBOX_FALLBACK = 'admin@binovya.test'

let envFileCache: Record<string, string> | undefined

/**
 * Reads a configuration value from `process.env` first, then from `.env.local`, so the same
 * tests run unchanged locally and in CI with secrets.
 * @param name - Variable name
 * @returns Value, or an empty string when it is not set
 */
export const readEnv = (name: string): string => {
  const fromProcess: string | undefined = process.env[name]
  if (fromProcess) {
    return fromProcess
  }
  const path: string = resolvePath(process.cwd(), '.env.local')
  envFileCache ??= existsSync(path)
    ? (parseEnv(readFileSync(path, 'utf8')) as Record<string, string>)
    : {}
  return envFileCache[name]?.trim() ?? ''
}

export const BASE_URL: string =
  process.env.TEST_BASE_URL ?? `http://localhost:${process.env.TEST_PORT ?? '3001'}`

export const ORIGIN: string = new URL(BASE_URL).origin

/**
 * Returns the mailbox that receives the alerts for BINOVYA on the test server.
 * @returns Address set by `NUXT_CONTACT_EMAIL_TO`, the test script exports `admin@binovya.test`
 */
export const adminMailbox = (): string =>
  process.env.NUXT_CONTACT_EMAIL_TO || ADMIN_MAILBOX_FALLBACK

/**
 * Builds a unique, recognisable test address. No mail leaves the machine, so it needs no inbox.
 * @param tag - Short label of the feature or scenario
 * @returns Address `e2e+<tag>-<timestamp>-<id>@binovya.test`
 */
export const uniqueTestEmail = (tag: string): string =>
  `e2e+${tag}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@binovya.test`
