/** Every step, in the order the runner executes them. */
export const TEST_STEPS = ['unit', 'integration', 'e2e'] as const

/** Test step the runner knows how to start. */
export type TestStep = (typeof TEST_STEPS)[number]

/** Steps and arguments read from the test runner's command line. */
export type TestArgs = {
  steps: TestStep[]
  forwarded: string[]
}

/** Error shown when forwarded arguments are given while several steps would run. */
export const FORWARDED_WITH_SEVERAL_STEPS_MESSAGE: string = `Les arguments transmis à Vitest ou Playwright n’ont de sens qu’avec une seule étape : précise-la (${TEST_STEPS.join(', ')}), par exemple \`bun run test:e2e -- --grep "…"\`.`

/**
 * Builds the error shown when the first argument is neither a step nor an option.
 * @param token - Argument that was expected to be a step name
 * @returns Message naming the argument and the known steps
 */
export const unknownStepMessage = (token: string): string =>
  `Étape de test inconnue : « ${token} » (${TEST_STEPS.join(', ')}).`

/**
 * Tells whether a command line token names a test step.
 * @param value - Token to check
 * @returns True when the token is one of `TEST_STEPS`
 */
export const isTestStep = (value: string): value is TestStep =>
  (TEST_STEPS as readonly string[]).includes(value)

/**
 * Splits the runner's arguments into steps and arguments forwarded to the step's tool.
 * Leading step names select the steps (all of them when none is given); everything from the
 * first other token, or after an explicit `--`, is forwarded untouched.
 * @param argv - Arguments after the script path (`process.argv.slice(2)`)
 * @returns Steps in execution order and the forwarded arguments
 * @throws Error when the first argument is an unknown step, or when arguments are forwarded
 * while several steps would run
 */
export const parseTestArgs = (argv: string[]): TestArgs => {
  const stepCount: number = argv.findIndex(arg => !isTestStep(arg))
  const requested: string[] = stepCount === -1 ? argv : argv.slice(0, stepCount)
  const rest: string[] = stepCount === -1 ? [] : argv.slice(stepCount)
  const firstRest: string | undefined = rest[0]
  if (requested.length === 0 && firstRest !== undefined && !firstRest.startsWith('-')) {
    throw new Error(unknownStepMessage(firstRest))
  }
  const forwarded: string[] = firstRest === '--' ? rest.slice(1) : rest
  const steps: TestStep[] =
    requested.length > 0 ? TEST_STEPS.filter(step => requested.includes(step)) : [...TEST_STEPS]
  if (forwarded.length > 0 && steps.length !== 1) {
    throw new Error(FORWARDED_WITH_SEVERAL_STEPS_MESSAGE)
  }
  return { steps, forwarded }
}
