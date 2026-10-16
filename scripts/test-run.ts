import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import { constants, accessSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { connect } from 'node:net'
import { delimiter, join, resolve as resolvePath } from 'node:path'

import { checkServerStripeKey, resolveStripeApiKey, stripeCliEnv } from './stripe-key'
import { MAIL_OUTBOX_ROOT, resolveTestOutboxDir } from './test-outbox'

type TestStep = 'unit' | 'integration' | 'e2e'

type StepCommand = {
  bin: string
  args: string[]
}

const TEST_STEPS: TestStep[] = ['unit', 'integration', 'e2e']

const STEP_COMMANDS: Record<TestStep, StepCommand> = {
  unit: { bin: 'vitest', args: ['run', '--project', 'unit'] },
  integration: { bin: 'vitest', args: ['run', '--project', 'integration'] },
  e2e: { bin: 'playwright', args: ['test'] },
}

const TEST_PORT: number = Number(process.env.TEST_PORT ?? '3001')

const BASE_URL = `http://localhost:${TEST_PORT}`

const SERVER_TIMEOUT_MS = 240_000

const LISTENER_TIMEOUT_MS = 30_000

const POLL_INTERVAL_MS = 1000

const KILL_GRACE_MS = 5000

const OTHER_LISTENER_MESSAGE =
  'Un autre `stripe listen` tourne déjà : arrête-le pendant les tests (sinon ton serveur de dev recevra les paiements de test et enverra de vrais mails).'

const LISTENER_STOPPED_MESSAGE =
  'Le listener Stripe s’est arrêté pendant les tests : les webhooks ne sont plus transmis au serveur de test. Relance les tests.'

const SERVER_LOG_LINES = 60

const VITE_EVENT_PATTERN = /optimized|reload/i

const children: ChildProcess[] = []

const serverLog: string[] = []

const viteEvents: string[] = []

let shutdown: Promise<never> | null = null

const isExecutable = (path: string): boolean => {
  try {
    accessSync(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

const findExecutable = (name: string): string => {
  const found: string | undefined = (process.env.PATH ?? '')
    .split(delimiter)
    .filter(dir => dir.length > 0)
    .map(dir => join(dir, name))
    .find(isExecutable)
  if (!found) {
    throw fail(`Commande \`${name}\` introuvable dans le PATH.`)
  }
  return found
}

const binPath = (bin: string): string => resolvePath(process.cwd(), 'node_modules/.bin', bin)

const announce = (message: string): void => {
  process.stdout.write(`${message}\n`)
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

const fail = (message: string): Error => new Error(message)

const readSteps = (): TestStep[] => {
  const requested: string[] = process.argv.slice(2)
  const unknown: string[] = requested.filter(step => !(TEST_STEPS as string[]).includes(step))
  if (unknown.length > 0) {
    throw fail(
      `Étape de test inconnue : ${unknown.join(', ')} (attendu : ${TEST_STEPS.join(', ')})`,
    )
  }
  return requested.length > 0
    ? TEST_STEPS.filter(step => requested.includes(step))
    : [...TEST_STEPS]
}

const isPortInUse = (port: number): Promise<boolean> =>
  new Promise(resolve => {
    const socket = connect({ port, host: 'localhost' })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })

const isOtherListenerRunning = (): boolean =>
  spawnSync(findExecutable('pgrep'), ['-f', 'stripe listen'], { stdio: 'ignore' }).status === 0

const findStripe = (): string => {
  try {
    return findExecutable('stripe')
  } catch {
    throw fail('Stripe CLI introuvable : installe-la (https://docs.stripe.com/stripe-cli).')
  }
}

const readWebhookSecret = (stripe: string, apiKey: string | null): string => {
  const result = spawnSync(stripe, ['listen', '--print-secret'], {
    encoding: 'utf8',
    env: stripeCliEnv(process.env, apiKey),
  })
  const secret: string = (result.stdout ?? '').trim()
  if (result.status === 0 && secret.startsWith('whsec_')) {
    return secret
  }
  throw fail(
    apiKey === null
      ? 'Stripe CLI non connectée : lance `stripe login`, puis relance les tests.'
      : 'Stripe CLI a refusé la clé de test (STRIPE_API_KEY ou NUXT_STRIPE_SECRET_KEY) : vérifie qu’elle est valide, puis relance les tests.',
  )
}

const startDetached = (command: string, args: string[], env: NodeJS.ProcessEnv): ChildProcess => {
  const child: ChildProcess = spawn(command, args, {
    env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  children.push(child)
  return child
}

const keepServerLog = (server: ChildProcess): void => {
  const onData = (chunk: Buffer): void => {
    const lines: string[] = chunk.toString().split('\n')
    viteEvents.push(...lines.filter(line => VITE_EVENT_PATTERN.test(line)))
    serverLog.push(...lines)
    serverLog.splice(0, Math.max(0, serverLog.length - SERVER_LOG_LINES))
  }
  server.stdout?.on('data', onData)
  server.stderr?.on('data', onData)
}

const waitForOutput = (child: ChildProcess, pattern: RegExp, label: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(
      () => reject(fail(`${label} : pas prêt après ${LISTENER_TIMEOUT_MS / 1000} s.`)),
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
      reject(fail(`${label} s'est arrêté avant d'être prêt.`))
    })
  })

const isServerReady = async (): Promise<boolean> => {
  try {
    const response: Response = await fetch(`${BASE_URL}/`)
    return response.status === 200
  } catch {
    return false
  }
}

const pollServer = async (server: ChildProcess, deadline: number): Promise<void> => {
  if (server.exitCode !== null) {
    throw fail('Le serveur de test s’est arrêté pendant le démarrage.')
  }
  if (await isServerReady()) {
    return
  }
  if (Date.now() >= deadline) {
    throw fail(
      `Le serveur de test ne répond pas sur ${BASE_URL} après ${SERVER_TIMEOUT_MS / 1000} s.`,
    )
  }
  await sleep(POLL_INTERVAL_MS)
  await pollServer(server, deadline)
}

const killGroup = (child: ChildProcess, signal: NodeJS.Signals): void => {
  if (child.pid === undefined || child.exitCode !== null) {
    return
  }
  try {
    process.kill(-child.pid, signal)
  } catch {
    child.kill(signal)
  }
}

const waitForExit = async (running: ChildProcess[], deadline: number): Promise<void> => {
  if (running.every(child => child.exitCode !== null) || Date.now() >= deadline) {
    return
  }
  await sleep(100)
  await waitForExit(running, deadline)
}

const stopChildren = async (): Promise<void> => {
  const running: ChildProcess[] = children.filter(child => child.exitCode === null)
  running.forEach(child => killGroup(child, 'SIGTERM'))
  await waitForExit(running, Date.now() + KILL_GRACE_MS)
  running.forEach(child => killGroup(child, 'SIGKILL'))
}

const exitAfterCleanup = (code: number): Promise<never> => {
  shutdown ??= stopChildren().then((): never => process.exit(code))
  return shutdown
}

const printViteEvents = (): void => {
  if (viteEvents.length > 0) {
    console.error(`\nÉvénements Vite du serveur de test :\n${viteEvents.join('\n')}`)
  }
}

const runStep = (step: TestStep, env: NodeJS.ProcessEnv): Promise<boolean> =>
  new Promise<boolean>(resolve => {
    const { bin, args } = STEP_COMMANDS[step]
    announce(`\n▶ Tests ${step}`)
    const child: ChildProcess = spawn(binPath(bin), args, { env, stdio: 'inherit' })
    children.push(child)
    child.once('exit', code => resolve(code === 0))
    child.once('error', () => resolve(false))
  }).then((isPassed: boolean): boolean => {
    if (!isPassed && step !== 'unit') {
      printViteEvents()
    }
    return isPassed
  })

const watchListener = (listener: ChildProcess): void => {
  listener.once('exit', () => {
    if (shutdown === null) {
      console.error(`\n✖ ${LISTENER_STOPPED_MESSAGE}`)
      exitAfterCleanup(1).catch(() => process.exit(1))
    }
  })
}

const readOutboxDir = (): string => {
  const dir: string | null = resolveTestOutboxDir(
    process.env.TEST_MAIL_OUTBOX_DIR ?? '',
    process.cwd(),
  )
  if (dir === null) {
    throw fail(
      `TEST_MAIL_OUTBOX_DIR doit désigner un sous-dossier de \`${MAIL_OUTBOX_ROOT}/\` : les tests le vident avant de démarrer.`,
    )
  }
  return dir
}

const startInfrastructure = async (outboxDir: string): Promise<NodeJS.ProcessEnv> => {
  if (isOtherListenerRunning()) {
    throw fail(OTHER_LISTENER_MESSAGE)
  }
  if (await isPortInUse(TEST_PORT)) {
    throw fail(`Le port ${TEST_PORT} est déjà utilisé : libère-le ou choisis TEST_PORT=<port>.`)
  }
  const stripe: string = findStripe()
  const apiKey: string | null = resolveStripeApiKey(process.env, process.cwd())
  const keyWarning: string | null = checkServerStripeKey(process.env, process.cwd())
  if (keyWarning !== null) {
    console.warn(keyWarning)
  }
  const secret: string = readWebhookSecret(stripe, apiKey)
  await rm(outboxDir, { recursive: true, force: true })
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    TEST_BASE_URL: BASE_URL,
    NUXT_SITE_URL: BASE_URL,
    NUXT_MAIL_TRANSPORT: 'outbox',
    NUXT_MAIL_OUTBOX_DIR: outboxDir,
    NUXT_CONTACT_EMAIL_TO: 'admin@binovya.test',
    NUXT_STRIPE_WEBHOOK_SECRET: secret,
    BINOVYA_TEST_SERVER: '1',
  }
  announce('▶ Démarrage du listener Stripe de test')
  const listener: ChildProcess = startDetached(
    stripe,
    ['listen', '--forward-to', `localhost:${TEST_PORT}/api/stripe/webhook`],
    stripeCliEnv(env, apiKey),
  )
  await waitForOutput(listener, /Ready!/, 'Le listener Stripe')
  watchListener(listener)
  announce(`▶ Démarrage du serveur de test sur ${BASE_URL}`)
  const server: ChildProcess = startDetached(
    binPath('nuxt'),
    ['dev', '--dotenv', '.env.local', '--port', String(TEST_PORT)],
    env,
  )
  keepServerLog(server)
  await pollServer(server, Date.now() + SERVER_TIMEOUT_MS).catch((error: unknown) => {
    console.error(serverLog.join('\n'))
    printViteEvents()
    throw error
  })
  return env
}

const runSteps = (steps: TestStep[], outboxDir: string): Promise<boolean> => {
  let serverEnv: Promise<NodeJS.ProcessEnv> | null = null
  const envFor = (step: TestStep): Promise<NodeJS.ProcessEnv> => {
    if (step === 'unit') {
      return Promise.resolve(process.env)
    }
    serverEnv ??= startInfrastructure(outboxDir)
    return serverEnv
  }
  return steps.reduce(
    async (previous: Promise<boolean>, step: TestStep): Promise<boolean> =>
      (await previous) && runStep(step, await envFor(step)),
    Promise.resolve(true),
  )
}

process.once('SIGINT', () => {
  exitAfterCleanup(130).catch(() => process.exit(130))
})
process.once('SIGTERM', () => {
  exitAfterCleanup(143).catch(() => process.exit(143))
})

try {
  const steps: TestStep[] = readSteps()
  const isPassed: boolean = await runSteps(steps, readOutboxDir())
  await exitAfterCleanup(isPassed ? 0 : 1)
} catch (error) {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`)
  await exitAfterCleanup(1)
}
