import { type ChildProcess, type SpawnSyncReturns, spawn, spawnSync } from 'node:child_process'
import { constants, accessSync } from 'node:fs'
import { type Socket, connect } from 'node:net'
import { delimiter, join, resolve as resolvePath } from 'node:path'

const KILL_GRACE_MS: number = 5000

/** Extended regex given to `pgrep -f`: a `stripe listen` command, not a line merely quoting it. */
export const STRIPE_LISTEN_PGREP_PATTERN: string = '^([^ ]*/)?stripe listen( |$)'

const children: ChildProcess[] = []

const detachedChildren: Set<ChildProcess> = new Set<ChildProcess>()

const cleanups: (() => Promise<void>)[] = []

let shutdown: Promise<never> | null = null

const isExecutable = (path: string): boolean => {
  try {
    accessSync(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Tells whether a value is a positive safe integer (pid, pgid, port).
 * @param value - Value to check
 * @returns True when the value is an integer greater than zero
 */
export const isPositiveInteger = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) > 0

/**
 * Finds a command in the `PATH`.
 * @param name - Command name
 * @returns Absolute path of the executable
 * @throws When the command is not found
 */
export const findExecutable = (name: string): string => {
  const found: string | undefined = (process.env.PATH ?? '')
    .split(delimiter)
    .filter(dir => dir.length > 0)
    .map(dir => join(dir, name))
    .find(isExecutable)
  if (!found) {
    throw new Error(`Commande \`${name}\` introuvable dans le PATH.`)
  }
  return found
}

/**
 * Resolves a binary installed in the project's `node_modules/.bin`.
 * @param bin - Binary name
 * @returns Absolute path of the binary
 */
export const binPath = (bin: string): string => resolvePath(process.cwd(), 'node_modules/.bin', bin)

/**
 * Prints a progress line on stdout.
 * @param message - Line to print
 */
export const announce = (message: string): void => {
  process.stdout.write(`${message}\n`)
}

/**
 * Waits for a delay.
 * @param ms - Delay in milliseconds
 * @returns Resolves after the delay
 */
export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Tells whether something accepts TCP connections on a local port.
 * @param port - Port to probe
 * @returns True when a connection succeeds
 */
export const isPortInUse = (port: number): Promise<boolean> =>
  new Promise(resolve => {
    const socket: Socket = connect({ port, host: 'localhost' })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })

/**
 * Builds the base URL of a server listening on a local port.
 * @param port - Local port
 * @returns URL without trailing slash, e.g. `http://localhost:3001`
 */
export const localBaseUrl = (port: number): string => `http://localhost:${port}`

/**
 * Tells whether a server answers 200 on its home page.
 * @param baseUrl - Base URL of the server, without trailing slash
 * @returns True when the home page answers 200
 */
export const isServerReady = async (baseUrl: string): Promise<boolean> => {
  try {
    const response: Response = await fetch(`${baseUrl}/`)
    return response.status === 200
  } catch {
    return false
  }
}

/**
 * Tells whether a process exists, without signalling it.
 * @param pid - Process id
 * @returns True when the process is alive
 */
export const isProcessAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * Runs a command and returns the integers it prints, one per line (pids, pgids).
 * @param command - Command name, looked up in the `PATH`
 * @param args - Command arguments
 * @returns Integers printed on stdout, empty when the command fails or is missing
 */
export const readPids = (command: string, args: string[]): number[] => {
  try {
    const result: SpawnSyncReturns<string> = spawnSync(findExecutable(command), args, {
      encoding: 'utf8',
    })
    return (result.stdout ?? '')
      .split('\n')
      .map(line => Number(line.trim()))
      .filter(isPositiveInteger)
  } catch {
    return []
  }
}

/**
 * Lists the pids of the running `stripe listen` processes.
 * @returns Pids, empty when none runs
 */
export const listStripeListenerPids = (): number[] =>
  readPids('pgrep', ['-f', STRIPE_LISTEN_PGREP_PATTERN])

/**
 * Reads the command line of a process.
 * @param pid - Process id
 * @returns Command line, or null when the process does not exist or `ps` fails
 */
export const readProcessCommand = (pid: number): string | null => {
  try {
    const result: SpawnSyncReturns<string> = spawnSync(
      findExecutable('ps'),
      ['-o', 'command=', '-p', String(pid)],
      { encoding: 'utf8' },
    )
    const command: string = (result.stdout ?? '').trim()
    return result.status === 0 && command.length > 0 ? command : null
  } catch {
    return null
  }
}

/**
 * Registers a child process so it is stopped on cleanup.
 * @param child - Child process
 */
export const trackChild = (child: ChildProcess): void => {
  children.push(child)
}

/**
 * Registers a task run before the children are stopped on exit.
 * @param task - Cleanup task
 */
export const addCleanup = (task: () => Promise<void>): void => {
  cleanups.push(task)
}

/**
 * Tells whether the process is already shutting down.
 * @returns True once `exitAfterCleanup` has been called
 */
export const isShuttingDown = (): boolean => shutdown !== null

const isRunning = (child: ChildProcess): boolean =>
  child.pid !== undefined && child.exitCode === null && child.signalCode === null

const killGroup = (child: ChildProcess, signal: NodeJS.Signals): void => {
  if (child.pid === undefined) {
    return
  }
  if (!detachedChildren.has(child)) {
    if (isRunning(child)) {
      child.kill(signal)
    }
    return
  }
  try {
    process.kill(-child.pid, signal)
  } catch {
    if (isRunning(child)) {
      child.kill(signal)
    }
  }
}

const waitForExit = async (running: ChildProcess[], deadline: number): Promise<void> => {
  if (!running.some(isRunning) || Date.now() >= deadline) {
    return
  }
  await sleep(100)
  await waitForExit(running, deadline)
}

const stopChildren = async (): Promise<void> => {
  await Promise.allSettled(cleanups.map(task => task()))
  const started: ChildProcess[] = children.filter(child => child.pid !== undefined)
  started.forEach(child => killGroup(child, 'SIGTERM'))
  await waitForExit(started, Date.now() + KILL_GRACE_MS)
  started.forEach(child => killGroup(child, 'SIGKILL'))
}

/**
 * Runs the cleanup tasks, stops every child process, then exits. Later calls reuse the first.
 * @param code - Exit code
 * @returns Never resolves: the process exits
 */
export const exitAfterCleanup = (code: number): Promise<never> => {
  shutdown ??= stopChildren().then((): never => process.exit(code))
  return shutdown
}

/**
 * Stops the children and exits on Ctrl+C, SIGTERM or SIGHUP (terminal closed). Later signals do
 * not interrupt the shutdown, so no child is left running.
 */
export const exitOnSignals = (): void => {
  const onSignal = (code: number): void => {
    if (isShuttingDown()) {
      announce('… Arrêt déjà en cours : les processus de test se terminent.')
      return
    }
    exitAfterCleanup(code).catch(() => process.exit(code))
  }
  process.on('SIGINT', () => onSignal(130))
  process.on('SIGTERM', () => onSignal(143))
  process.on('SIGHUP', () => onSignal(129))
}

/**
 * Prints an error and exits after cleanup.
 * @param error - Thrown value
 * @returns Never resolves: the process exits
 */
export const failAndExit = (error: unknown): Promise<never> => {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}`)
  return exitAfterCleanup(1)
}

/**
 * Prints an error and exits after cleanup, from a callback that cannot await.
 * @param cause - Thrown value
 */
export const failInBackground = (cause: unknown): void => {
  failAndExit(cause).catch(() => process.exit(1))
}

/**
 * Starts a child process in its own process group, so it can be stopped with its descendants.
 * @param command - Executable path
 * @param args - Arguments
 * @param env - Environment of the child
 * @returns Started child, registered for cleanup; a spawn failure exits after cleanup
 */
export const startDetached = (
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): ChildProcess => {
  const child: ChildProcess = spawn(command, args, {
    env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  trackChild(child)
  detachedChildren.add(child)
  child.once('error', (cause: Error) => {
    failInBackground(new Error(`Impossible de lancer ${command} : ${cause.message}`))
  })
  return child
}
