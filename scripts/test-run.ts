import { type ChildProcess, spawn } from 'node:child_process'

import { type TestArgs, type TestStep, parseTestArgs } from './test-args'
import {
  BASE_URL,
  TEST_PORT,
  type TestInfrastructure,
  prepareWarmInfrastructure,
  printViteEvents,
  readOutboxDir,
  startInfrastructure,
} from './test-infra'
import { acquireTestRunLock } from './test-lock'
import {
  announce,
  binPath,
  exitAfterCleanup,
  exitOnSignals,
  failAndExit,
  trackChild,
} from './test-process'
import { type TestServerState, findWarmTestServer } from './test-server-state'

type StepCommand = {
  bin: string
  args: string[]
}

const STEP_COMMANDS: Record<TestStep, StepCommand> = {
  unit: { bin: 'vitest', args: ['run', '--project', 'unit'] },
  integration: { bin: 'vitest', args: ['run', '--project', 'integration'] },
  e2e: { bin: 'playwright', args: ['test'] },
}

const runStep = (step: TestStep, env: NodeJS.ProcessEnv, forwarded: string[]): Promise<boolean> =>
  new Promise<boolean>(resolve => {
    const { bin, args }: StepCommand = STEP_COMMANDS[step]
    announce(`\n▶ Tests ${step}`)
    const child: ChildProcess = spawn(binPath(bin), [...args, ...forwarded], {
      env,
      stdio: 'inherit',
    })
    trackChild(child)
    child.once('exit', code => resolve(code === 0))
    child.once('error', () => resolve(false))
  }).then((isPassed: boolean): boolean => {
    if (!isPassed && step !== 'unit') {
      printViteEvents()
    }
    return isPassed
  })

const prepareServer = async (outboxDir: string): Promise<NodeJS.ProcessEnv> => {
  await acquireTestRunLock(process.cwd())
  const warm: TestServerState | null = await findWarmTestServer(TEST_PORT, process.cwd())
  if (warm === null) {
    const infrastructure: TestInfrastructure = await startInfrastructure({
      outboxDir,
      echoServerLog: false,
    })
    return infrastructure.env
  }
  announce(`▶ Serveur de test lancé par \`bun run test:server\` réutilisé sur ${BASE_URL}`)
  if (warm.outboxDir !== outboxDir) {
    console.warn(
      `⚠ TEST_MAIL_OUTBOX_DIR diffère du serveur de test : les tests lisent sa boîte, ${warm.outboxDir}.`,
    )
  }
  return prepareWarmInfrastructure(warm.outboxDir, warm.listenerPid)
}

const runSteps = ({ steps, forwarded }: TestArgs, outboxDir: string): Promise<boolean> => {
  let serverEnv: Promise<NodeJS.ProcessEnv> | null = null
  const envFor = (step: TestStep): Promise<NodeJS.ProcessEnv> => {
    if (step === 'unit') {
      return Promise.resolve(process.env)
    }
    serverEnv ??= prepareServer(outboxDir)
    return serverEnv
  }
  return steps.reduce(
    async (previous: Promise<boolean>, step: TestStep): Promise<boolean> =>
      (await previous) && runStep(step, await envFor(step), forwarded),
    Promise.resolve(true),
  )
}

exitOnSignals()

try {
  const testArgs: TestArgs = parseTestArgs(process.argv.slice(2))
  const isPassed: boolean = await runSteps(testArgs, readOutboxDir())
  await exitAfterCleanup(isPassed ? 0 : 1)
} catch (error) {
  await failAndExit(error)
}
