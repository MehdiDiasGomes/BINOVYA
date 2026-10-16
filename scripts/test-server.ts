import {
  BASE_URL,
  TEST_PORT,
  type TestInfrastructure,
  exitWhenStopped,
  readOutboxDir,
  startInfrastructure,
} from './test-infra'
import { addCleanup, announce, exitOnSignals, failAndExit } from './test-process'
import { removeTestServerState, writeTestServerState } from './test-server-state'

const SERVER_STOPPED_MESSAGE: string =
  'Le serveur de test s’est arrêté : relance `bun run test:server`.'

const startWarmServer = async (): Promise<void> => {
  const outboxDir: string = readOutboxDir()
  addCleanup(() => removeTestServerState(process.pid, process.cwd()))
  const { listener, server }: TestInfrastructure = await startInfrastructure({
    outboxDir,
    echoServerLog: true,
  })
  if (listener.pid === undefined || server.pid === undefined) {
    throw new Error('Le serveur de test n’a pas pu démarrer.')
  }
  exitWhenStopped(server, SERVER_STOPPED_MESSAGE)
  await writeTestServerState(
    {
      runnerPid: process.pid,
      serverPgid: server.pid,
      listenerPid: listener.pid,
      port: TEST_PORT,
      outboxDir,
    },
    process.cwd(),
  )
  announce(`\n✔ Serveur de test prêt : TEST_BASE_URL=${BASE_URL}`)
  announce(
    '✔ Les autres terminaux et agents peuvent maintenant lancer `bun run test:integration`, `bun run test:e2e` ou `bun run test` : ils réutilisent ce serveur. Ctrl+C pour l’arrêter.',
  )
}

exitOnSignals()

try {
  await startWarmServer()
} catch (error) {
  await failAndExit(error)
}
