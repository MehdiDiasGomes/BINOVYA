import { type ChildProcess, type SpawnSyncReturns, spawnSync } from 'node:child_process'
import { rm } from 'node:fs/promises'

import { checkServerStripeKey, resolveStripeApiKey, stripeCliEnv } from './stripe-key'
import { lockHeldMessage, readLiveLockHolder } from './test-lock'
import { MAIL_OUTBOX_ROOT, resolveTestOutboxDir } from './test-outbox'
import {
  addCleanup,
  announce,
  binPath,
  failInBackground,
  findExecutable,
  isPortInUse,
  isPositiveInteger,
  isProcessAlive,
  isServerReady,
  isShuttingDown,
  listStripeListenerPids,
  localBaseUrl,
  sleep,
  startDetached,
} from './test-process'
import { portInUseMessage, readTestServerState } from './test-server-state'

/**
 * Reads the port of the test server.
 * @param raw - Value of `TEST_PORT`, undefined when unset
 * @returns The port, 3001 when unset
 * @throws When the value is not a positive integer
 */
export const parseTestPort = (raw: string | undefined): number => {
  const port: number = Number(raw ?? '3001')
  if (!isPositiveInteger(port)) {
    throw new Error('TEST_PORT doit être un entier positif.')
  }
  return port
}

/** Port of the test server, `TEST_PORT` or 3001. */
export const TEST_PORT: number = parseTestPort(process.env.TEST_PORT)

/** Mailbox receiving the admin alerts on the test server (`NUXT_CONTACT_EMAIL_TO`). */
export const TEST_ADMIN_MAILBOX: string = 'admin@binovya.test'

/** Base URL of the test server. */
export const BASE_URL: string = localBaseUrl(TEST_PORT)

/** Processes and environment of a test server started by the current script. */
export type TestInfrastructure = {
  env: NodeJS.ProcessEnv
  listener: ChildProcess
  server: ChildProcess
}

/** Options of `startInfrastructure`. */
export type InfrastructureOptions = {
  outboxDir: string
  echoServerLog: boolean
}

const SERVER_TIMEOUT_MS: number = 240_000

const LISTENER_TIMEOUT_MS: number = 30_000

const POLL_INTERVAL_MS: number = 1000

const OTHER_LISTENER_MESSAGE: string =
  'Un autre `stripe listen` tourne déjà : arrête-le pendant les tests (sinon ton serveur de dev recevra les paiements de test et enverra de vrais mails).'

const LISTENER_STOPPED_MESSAGE: string =
  'Le listener Stripe s’est arrêté : les webhooks ne sont plus transmis au serveur de test. Relance les tests.'

const WARM_LISTENER_STOPPED_MESSAGE: string =
  'Le listener Stripe de `bun run test:server` s’est arrêté : les webhooks ne sont plus transmis au serveur de test. Relance `bun run test:server`, puis les tests.'

const SERVER_LOG_LINES: number = 60

const VITE_EVENT_LINES: number = 60

const VITE_EVENT_PATTERN: RegExp = /optimized|reload/i

const serverLog: string[] = []

const viteEvents: string[] = []

const findStripe = (): string => {
  try {
    return findExecutable('stripe')
  } catch {
    throw new Error('Stripe CLI introuvable : installe-la (https://docs.stripe.com/stripe-cli).')
  }
}

const readWebhookSecret = (stripe: string, apiKey: string | null): string => {
  const result: SpawnSyncReturns<string> = spawnSync(stripe, ['listen', '--print-secret'], {
    encoding: 'utf8',
    env: stripeCliEnv(process.env, apiKey),
  })
  const secret: string = (result.stdout ?? '').trim()
  if (result.status === 0 && secret.startsWith('whsec_')) {
    return secret
  }
  throw new Error(
    apiKey === null
      ? 'Stripe CLI non connectée : lance `stripe login`, puis relance les tests.'
      : 'Stripe CLI a refusé la clé de test (STRIPE_API_KEY ou NUXT_STRIPE_SECRET_KEY) : vérifie qu’elle est valide, puis relance les tests.',
  )
}

type StripeSetup = {
  stripe: string
  apiKey: string | null
  secret: string
}

const prepareStripe = (allowedListenerPid: number | null): StripeSetup => {
  const others: number[] = listStripeListenerPids().filter(pid => pid !== allowedListenerPid)
  if (others.length > 0) {
    throw new Error(OTHER_LISTENER_MESSAGE)
  }
  const stripe: string = findStripe()
  const apiKey: string | null = resolveStripeApiKey(process.env, process.cwd())
  const keyWarning: string | null = checkServerStripeKey(process.env, process.cwd())
  if (keyWarning !== null) {
    console.warn(keyWarning)
  }
  return { stripe, apiKey, secret: readWebhookSecret(stripe, apiKey) }
}

const buildTestEnv = (outboxDir: string, secret: string): NodeJS.ProcessEnv => ({
  ...process.env,
  TEST_BASE_URL: BASE_URL,
  NUXT_SITE_URL: BASE_URL,
  NUXT_MAIL_TRANSPORT: 'outbox',
  NUXT_MAIL_OUTBOX_DIR: outboxDir,
  NUXT_CONTACT_EMAIL_TO: TEST_ADMIN_MAILBOX,
  NUXT_STRIPE_WEBHOOK_SECRET: secret,
  BINOVYA_TEST_SERVER: '1',
})

/**
 * Reads the test outbox directory from `TEST_MAIL_OUTBOX_DIR`.
 * @returns Absolute directory inside `.mail-outbox/`
 * @throws When the directory is outside `.mail-outbox/` or is its root
 */
export const readOutboxDir = (): string => {
  const dir: string | null = resolveTestOutboxDir(
    process.env.TEST_MAIL_OUTBOX_DIR ?? '',
    process.cwd(),
  )
  if (dir === null) {
    throw new Error(
      `TEST_MAIL_OUTBOX_DIR doit désigner un sous-dossier de \`${MAIL_OUTBOX_ROOT}/\` : les tests le vident avant de démarrer.`,
    )
  }
  return dir
}

const pushCapped = (target: string[], lines: string[], max: number): void => {
  target.push(...lines)
  target.splice(0, Math.max(0, target.length - max))
}

const keepServerLog = (server: ChildProcess, echo: boolean): void => {
  const onData = (chunk: Buffer): void => {
    const lines: string[] = chunk.toString().split('\n')
    pushCapped(
      viteEvents,
      lines.filter(line => VITE_EVENT_PATTERN.test(line)),
      VITE_EVENT_LINES,
    )
    pushCapped(serverLog, lines, SERVER_LOG_LINES)
    if (echo) {
      process.stdout.write(chunk)
    }
  }
  server.stdout?.on('data', onData)
  server.stderr?.on('data', onData)
}

/**
 * Prints the Vite optimisation and reload events seen in the server's output, if any.
 */
export const printViteEvents = (): void => {
  if (viteEvents.length > 0) {
    console.error(`\nÉvénements Vite du serveur de test :\n${viteEvents.join('\n')}`)
  }
}

const waitForOutput = (child: ChildProcess, pattern: RegExp, label: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(
      () => reject(new Error(`${label} : pas prêt après ${LISTENER_TIMEOUT_MS / 1000} s.`)),
      LISTENER_TIMEOUT_MS,
    )
    const onData = (chunk: Buffer): void => {
      if (pattern.test(chunk.toString())) {
        clearTimeout(timer)
        resolve()
      }
    }
    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)
    child.once('exit', () => {
      clearTimeout(timer)
      reject(new Error(`${label} s'est arrêté avant d'être prêt.`))
    })
  })

const pollServer = async (server: ChildProcess, deadline: number): Promise<void> => {
  if (server.exitCode !== null) {
    throw new Error('Le serveur de test s’est arrêté pendant le démarrage.')
  }
  if (await isServerReady(BASE_URL)) {
    return
  }
  if (Date.now() >= deadline) {
    throw new Error(
      `Le serveur de test ne répond pas sur ${BASE_URL} après ${SERVER_TIMEOUT_MS / 1000} s.`,
    )
  }
  await sleep(POLL_INTERVAL_MS)
  await pollServer(server, deadline)
}

/**
 * Exits after cleanup with a message when a child process stops while the script still runs.
 * @param child - Watched child process
 * @param message - Message printed when it stops
 */
export const exitWhenStopped = (child: ChildProcess, message: string): void => {
  child.once('exit', () => {
    if (!isShuttingDown()) {
      failInBackground(new Error(message))
    }
  })
}

/**
 * Starts `stripe listen` and `nuxt dev` on `TEST_PORT` after every guard: no other
 * `stripe listen`, free port, `sk_test_` keys only. Empties the outbox first.
 * @param options - Outbox directory and whether the server's output is echoed
 * @returns Environment for the tests and the started processes
 * @throws When a guard fails or a process does not become ready
 */
export const startInfrastructure = async ({
  outboxDir,
  echoServerLog,
}: InfrastructureOptions): Promise<TestInfrastructure> => {
  if (await isPortInUse(TEST_PORT)) {
    const lockHolder: number | null = await readLiveLockHolder(process.cwd())
    throw new Error(
      lockHolder === null
        ? portInUseMessage(TEST_PORT, await readTestServerState(process.cwd()))
        : lockHeldMessage(lockHolder),
    )
  }
  const { stripe, apiKey, secret }: StripeSetup = prepareStripe(null)
  await rm(outboxDir, { recursive: true, force: true })
  const env: NodeJS.ProcessEnv = buildTestEnv(outboxDir, secret)
  announce('▶ Démarrage du listener Stripe de test')
  const listener: ChildProcess = startDetached(
    stripe,
    ['listen', '--forward-to', `localhost:${TEST_PORT}/api/stripe/webhook`],
    stripeCliEnv(env, apiKey),
  )
  await waitForOutput(listener, /Ready!/, 'Le listener Stripe')
  exitWhenStopped(listener, LISTENER_STOPPED_MESSAGE)
  announce(`▶ Démarrage du serveur de test sur ${BASE_URL}`)
  const server: ChildProcess = startDetached(
    binPath('nuxt'),
    ['dev', '--dotenv', '.env.local', '--port', String(TEST_PORT)],
    env,
  )
  keepServerLog(server, echoServerLog)
  await pollServer(server, Date.now() + SERVER_TIMEOUT_MS).catch((error: unknown) => {
    if (!echoServerLog) {
      console.error(serverLog.join('\n'))
    }
    printViteEvents()
    throw error
  })
  return { env, listener, server }
}

const watchWarmListener = (listenerPid: number): void => {
  const timer: ReturnType<typeof setInterval> = setInterval(() => {
    if (!isShuttingDown() && !isProcessAlive(listenerPid)) {
      clearInterval(timer)
      failInBackground(new Error(WARM_LISTENER_STOPPED_MESSAGE))
    }
  }, POLL_INTERVAL_MS)
  timer.unref()
  addCleanup(async () => clearInterval(timer))
}

/**
 * Prepares the tests against a server already started by `bun run test:server`: same guards
 * on the Stripe listener and keys, outbox emptied, webhook secret read again from the Stripe CLI.
 * The server's `stripe listen` is then checked every second: the run fails if it stops.
 * @param outboxDir - Outbox directory of the running server
 * @param listenerPid - Pid of the server's own `stripe listen`, the only one allowed
 * @returns Environment for the tests
 * @throws When a guard fails
 */
export const prepareWarmInfrastructure = async (
  outboxDir: string,
  listenerPid: number,
): Promise<NodeJS.ProcessEnv> => {
  const { secret }: StripeSetup = prepareStripe(listenerPid)
  await rm(outboxDir, { recursive: true, force: true })
  watchWarmListener(listenerPid)
  return buildTestEnv(outboxDir, secret)
}
