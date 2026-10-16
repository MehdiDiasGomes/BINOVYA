import { type FileHandle, mkdir, open, readFile, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { addCleanup, isPositiveInteger, readProcessCommand, sleep } from './test-process'

/** Lock file of the run using the test server, relative to the project root (gitignored). */
export const TEST_RUN_LOCK_FILE: string = '.cache/test-run.lock'

const PID_PATTERN: RegExp = /^\d+$/

/** Matches the command line of a test runner process (`bun scripts/test-run.ts …`). */
export const TEST_RUN_COMMAND_PATTERN: RegExp = /(^|[\s/])test-run\.ts(\s|$)/

const PARTIAL_WRITE_DELAY_MS: number = 200

/**
 * Reads the pid stored in the lock file.
 * @param content - Content of the lock file
 * @returns The pid, or null when the content is not a positive integer
 */
export const parseLockPid = (content: string): number | null => {
  const trimmed: string = content.trim()
  const pid: number = Number(trimmed)
  return PID_PATTERN.test(trimmed) && isPositiveInteger(pid) ? pid : null
}

/**
 * Tells whether a command line is the one of a test runner.
 * @param command - Command line read with `ps`, or null when the process does not exist
 * @returns True when the command runs `test-run.ts`
 */
export const isTestRunCommand = (command: string | null): boolean =>
  command !== null && TEST_RUN_COMMAND_PATTERN.test(command)

const isTestRunProcess = (pid: number): boolean => isTestRunCommand(readProcessCommand(pid))

/**
 * Builds the error shown when another run holds the lock.
 * @param pid - Pid of the test runner holding the lock, or null when no test runner owns it
 * @returns Message naming the pid when known, otherwise advising to remove the lock file
 */
export const lockHeldMessage = (pid: number | null): string =>
  pid === null
    ? `Un autre run de tests utilise déjà le serveur de test et sa boîte mail (verrou \`${TEST_RUN_LOCK_FILE}\`) : attends qu’il se termine, puis relance. Si aucun run ne tourne, supprime \`${TEST_RUN_LOCK_FILE}\`.`
    : `Un autre run de tests (pid ${pid}) utilise déjà le serveur de test et sa boîte mail : attends qu’il se termine ou arrête-le avec \`kill ${pid}\`, puis relance.`

/**
 * Tells whether the lock must be respected: its pid is valid, is not the current process and is
 * a running test runner. Any other lock, including one whose pid was reused by an unrelated
 * process, is stale and may be replaced.
 * @param pid - Pid read from the lock file, or null when unreadable
 * @param isTestRun - Tells whether a pid is a running test runner
 * @returns True when another test runner holds the lock
 */
export const isLockHeld = (pid: number | null, isTestRun: (pid: number) => boolean): boolean =>
  pid !== null && pid !== process.pid && isTestRun(pid)

const lockPath = (rootDir: string): string => resolve(rootDir, TEST_RUN_LOCK_FILE)

const readLockPid = async (path: string): Promise<number | null> => {
  const content: string = await readFile(path, 'utf8').catch((): string => '')
  return parseLockPid(content)
}

const tryCreateLock = async (path: string): Promise<boolean> => {
  const handle: FileHandle | null = await open(path, 'wx', 0o600).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      return null
    }
    throw error
  })
  if (handle === null) {
    return false
  }
  try {
    await handle.writeFile(`${process.pid}\n`)
  } finally {
    await handle.close()
  }
  return true
}

const readHolderPid = async (path: string): Promise<number | null> => {
  const pid: number | null = await readLockPid(path)
  if (pid !== null) {
    return pid
  }
  await sleep(PARTIAL_WRITE_DELAY_MS)
  return readLockPid(path)
}

const liveHolderOrNull = (pid: number | null): number | null =>
  isLockHeld(pid, isTestRunProcess) ? pid : null

const releaseLock = async (path: string): Promise<void> => {
  if ((await readLockPid(path)) === process.pid) {
    await rm(path, { force: true })
  }
}

/**
 * Reads the pid of another live test runner holding the lock.
 * @param rootDir - Project root
 * @returns Pid of the test runner holding the lock, or null when the lock is free or stale
 */
export const readLiveLockHolder = async (rootDir: string): Promise<number | null> =>
  liveHolderOrNull(await readLockPid(lockPath(rootDir)))

const replaceStaleLock = async (path: string): Promise<void> => {
  await rm(path, { force: true })
  if (!(await tryCreateLock(path))) {
    throw new Error(lockHeldMessage(liveHolderOrNull(await readHolderPid(path))))
  }
  await sleep(PARTIAL_WRITE_DELAY_MS)
  const owner: number | null = await readLockPid(path)
  if (owner !== process.pid) {
    throw new Error(lockHeldMessage(liveHolderOrNull(owner)))
  }
}

/**
 * Takes the lock of the runs using the test server, so two runs never share its outbox at once.
 * A lock whose pid is no longer a running test runner is replaced. The lock is released on exit.
 * @param rootDir - Project root
 * @returns Resolves once the lock is held by the current process
 * @throws When another live run holds the lock
 */
export const acquireTestRunLock = async (rootDir: string): Promise<void> => {
  const path: string = lockPath(rootDir)
  await mkdir(dirname(path), { recursive: true })
  if (!(await tryCreateLock(path))) {
    const holder: number | null = await readHolderPid(path)
    if (isLockHeld(holder, isTestRunProcess)) {
      throw new Error(lockHeldMessage(holder))
    }
    await replaceStaleLock(path)
  }
  addCleanup(() => releaseLock(path))
}
