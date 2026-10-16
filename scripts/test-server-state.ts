import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { resolveTestOutboxDir } from './test-outbox'
import {
  isPortInUse,
  isPositiveInteger,
  isProcessAlive,
  isServerReady,
  localBaseUrl,
  readPids,
} from './test-process'

/** State file written by `bun run test:server`, relative to the project root (gitignored). */
export const TEST_SERVER_STATE_FILE: string = '.cache/test-server.json'

/** Processes and settings of a test server started by `bun run test:server`. */
export type TestServerState = {
  runnerPid: number
  serverPgid: number
  listenerPid: number
  port: number
  outboxDir: string
}

const STATE_KEYS: (keyof TestServerState)[] = [
  'runnerPid',
  'serverPgid',
  'listenerPid',
  'port',
  'outboxDir',
]

/**
 * Validates the parsed content of the state file.
 * @param raw - Parsed JSON
 * @returns The state, or null when a field is missing, extra or of the wrong type
 */
export const parseTestServerState = (raw: unknown): TestServerState | null => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null
  }
  const record: Record<string, unknown> = raw as Record<string, unknown>
  const keys: string[] = Object.keys(record)
  const hasExactKeys: boolean =
    keys.length === STATE_KEYS.length && STATE_KEYS.every(key => keys.includes(key))
  const isValid: boolean =
    hasExactKeys &&
    isPositiveInteger(record.runnerPid) &&
    isPositiveInteger(record.serverPgid) &&
    isPositiveInteger(record.listenerPid) &&
    isPositiveInteger(record.port) &&
    typeof record.outboxDir === 'string'
  return isValid ? (record as TestServerState) : null
}

const statePath = (rootDir: string): string => resolve(rootDir, TEST_SERVER_STATE_FILE)

/**
 * Writes the state file of the current `test:server`. It holds no key nor secret.
 * @param state - Processes and settings of the test server
 * @param rootDir - Project root
 * @returns Resolves once written
 */
export const writeTestServerState = async (
  state: TestServerState,
  rootDir: string,
): Promise<void> => {
  const path: string = statePath(rootDir)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
}

/**
 * Reads and validates the state file.
 * @param rootDir - Project root
 * @returns The recorded state, or null when the file is missing or invalid
 */
export const readTestServerState = async (rootDir: string): Promise<TestServerState | null> => {
  try {
    return parseTestServerState(JSON.parse(await readFile(statePath(rootDir), 'utf8')))
  } catch {
    return null
  }
}

/**
 * Removes the state file when it belongs to the given `test:server` process.
 * @param runnerPid - Pid of the `test:server` process
 * @param rootDir - Project root
 * @returns Resolves once removed, or when the file belongs to another process
 */
export const removeTestServerState = async (runnerPid: number, rootDir: string): Promise<void> => {
  const state: TestServerState | null = await readTestServerState(rootDir)
  if (state === null || state.runnerPid === runnerPid) {
    await rm(statePath(rootDir), { force: true })
  }
}

const listeningPids = (port: number): number[] =>
  readPids('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'])

const processGroup = (pid: number): number | undefined =>
  readPids('ps', ['-o', 'pgid=', '-p', String(pid)])[0]

const isPortOwnedBy = (port: number, pgid: number): boolean => {
  const pids: number[] = listeningPids(port)
  return pids.length > 0 && pids.every(pid => processGroup(pid) === pgid)
}

/**
 * Finds a running test server started by `bun run test:server` on the given port. The port must
 * be held by the server's process group, its `test:server` and `stripe listen` processes alive,
 * its outbox inside `.mail-outbox/`, and its home page must answer 200: the developer's own dev
 * server or an unknown process is never reused.
 * @param port - Test port
 * @param rootDir - Project root
 * @returns The server's state, or null when no reusable server runs
 */
export const findWarmTestServer = async (
  port: number,
  rootDir: string,
): Promise<TestServerState | null> => {
  const state: TestServerState | null = await readTestServerState(rootDir)
  const isOwned: boolean =
    state !== null &&
    state.port === port &&
    isProcessAlive(state.runnerPid) &&
    isProcessAlive(state.listenerPid) &&
    resolveTestOutboxDir(state.outboxDir, rootDir) === state.outboxDir &&
    (await isPortInUse(port)) &&
    isPortOwnedBy(port, state.serverPgid)
  return isOwned && (await isServerReady(localBaseUrl(port))) ? state : null
}

/**
 * Builds the error shown when the test port is already taken. When a state file records a
 * `test:server` on that port, adds the commands that stop its server and its Stripe listener.
 * @param port - Test port
 * @param state - Recorded state, or null when there is none
 * @returns Message naming the port, with the stop commands when the state matches the port
 */
export const portInUseMessage = (port: number, state: TestServerState | null): string => {
  const base: string = `Le port ${port} est déjà utilisé : libère-le ou choisis TEST_PORT=<port>.`
  return state === null || state.port !== port
    ? base
    : `${base} S’il s’agit d’un ancien \`bun run test:server\`, arrête-le avec \`kill -- -${state.serverPgid}\` puis \`kill ${state.listenerPid}\`.`
}
