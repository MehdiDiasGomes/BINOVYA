import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseEnv } from 'node:util'

const ENV_FILE: string = '.env.local'

const TEST_KEY_PREFIX: string = 'sk_test_'

const NOT_TEST_KEY_MESSAGE: string =
  'La clé Stripe trouvée (STRIPE_API_KEY ou NUXT_STRIPE_SECRET_KEY) n’est pas une clé de test `sk_test_…` : les tests refusent de tourner avec une autre clé.'

const NOT_TEST_SERVER_KEY_MESSAGE: string =
  'La clé Stripe du serveur de test (NUXT_STRIPE_SECRET_KEY) n’est pas une clé de test `sk_test_…` : les tests refusent de tourner avec une autre clé.'

const KEY_MISMATCH_WARNING: string =
  '⚠ STRIPE_API_KEY et NUXT_STRIPE_SECRET_KEY sont différentes : elles doivent viser le même compte Stripe, sinon le listener ne reçoit pas les paiements créés par le serveur.'

const nonEmpty = (value: string | undefined): string | undefined =>
  value && value.trim().length > 0 ? value.trim() : undefined

const readEnvFile = (rootDir: string): Record<string, string> => {
  try {
    return parseEnv(readFileSync(resolve(rootDir, ENV_FILE), 'utf8')) as Record<string, string>
  } catch {
    return {}
  }
}

const readServerKey = (env: NodeJS.ProcessEnv, rootDir: string): string | undefined =>
  nonEmpty(env.NUXT_STRIPE_SECRET_KEY) ?? nonEmpty(readEnvFile(rootDir).NUXT_STRIPE_SECRET_KEY)

/**
 * Finds the Stripe secret key the Stripe CLI uses during the tests: `STRIPE_API_KEY`, then
 * `NUXT_STRIPE_SECRET_KEY` from the environment, then from `.env.local`.
 * @param env - Environment of the test runner
 * @param rootDir - Project root holding `.env.local`
 * @returns Test secret key, or null when none is set and the stored `stripe login` session is used
 * @throws When the key found is not a `sk_test_` key
 */
export const resolveStripeApiKey = (env: NodeJS.ProcessEnv, rootDir: string): string | null => {
  const key: string | undefined = nonEmpty(env.STRIPE_API_KEY) ?? readServerKey(env, rootDir)
  if (key === undefined) {
    return null
  }
  if (!key.startsWith(TEST_KEY_PREFIX)) {
    throw new Error(NOT_TEST_KEY_MESSAGE)
  }
  return key
}

/**
 * Builds the environment of a Stripe CLI process. The key goes through `STRIPE_API_KEY` rather
 * than `--api-key` so that it never shows in the process list.
 * @param env - Environment to extend
 * @param apiKey - Test secret key, or null to keep the stored `stripe login` session
 * @returns Environment for the Stripe CLI
 */
export const stripeCliEnv = (env: NodeJS.ProcessEnv, apiKey: string | null): NodeJS.ProcessEnv =>
  apiKey === null ? env : { ...env, STRIPE_API_KEY: apiKey }

/**
 * Checks the Stripe secret key of the test server, `NUXT_STRIPE_SECRET_KEY` from the environment
 * then from `.env.local`, against the key of the Stripe CLI. Never includes a key in its messages.
 * @param env - Environment of the test runner
 * @param rootDir - Project root holding `.env.local`
 * @returns Warning to print when `STRIPE_API_KEY` differs from the server key, otherwise null
 * @throws When the server key is not a `sk_test_` key
 */
export const checkServerStripeKey = (env: NodeJS.ProcessEnv, rootDir: string): string | null => {
  const serverKey: string | undefined = readServerKey(env, rootDir)
  if (serverKey !== undefined && !serverKey.startsWith(TEST_KEY_PREFIX)) {
    throw new Error(NOT_TEST_SERVER_KEY_MESSAGE)
  }
  const cliKey: string | undefined = nonEmpty(env.STRIPE_API_KEY)
  return cliKey !== undefined && serverKey !== undefined && cliKey !== serverKey
    ? KEY_MISMATCH_WARNING
    : null
}
