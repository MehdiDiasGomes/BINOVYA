import { isAbsolute, relative, resolve, sep } from 'node:path'

/** Root of the local mail outboxes, relative to the project root. */
export const MAIL_OUTBOX_ROOT: string = '.mail-outbox'

/** Default outbox directory of the test server, relative to the project root. */
export const TEST_OUTBOX_DIR: string = `${MAIL_OUTBOX_ROOT}/test-run`

/**
 * Resolves the test outbox directory and checks it lies strictly inside `<rootDir>/.mail-outbox/`,
 * so the test runner never deletes the development outbox root or a directory elsewhere.
 * @param configuredDir - Value of `TEST_MAIL_OUTBOX_DIR`, empty for `TEST_OUTBOX_DIR`
 * @param rootDir - Project root relative paths are resolved from
 * @returns Absolute directory path, or null when it is outside `.mail-outbox/` or is its root
 */
export const resolveTestOutboxDir = (configuredDir: string, rootDir: string): string | null => {
  const dir: string = resolve(rootDir, configuredDir || TEST_OUTBOX_DIR)
  const fromRoot: string = relative(resolve(rootDir, MAIL_OUTBOX_ROOT), dir)
  const isInside: boolean =
    fromRoot.length > 0 &&
    !isAbsolute(fromRoot) &&
    fromRoot !== '..' &&
    !fromRoot.startsWith(`..${sep}`)
  return isInside ? dir : null
}
