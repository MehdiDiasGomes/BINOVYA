import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  checkServerStripeKey,
  resolveStripeApiKey,
  stripeCliEnv,
} from '../../../scripts/stripe-key'

let dir = ''

const writeEnvLocal = async (content: string): Promise<void> => {
  await writeFile(join(dir, '.env.local'), content)
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'binovya-stripe-key-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('resolveStripeApiKey', () => {
  it('prefers STRIPE_API_KEY over the other sources', async () => {
    await writeEnvLocal('NUXT_STRIPE_SECRET_KEY=sk_test_file\n')
    const env: NodeJS.ProcessEnv = {
      STRIPE_API_KEY: 'sk_test_cli',
      NUXT_STRIPE_SECRET_KEY: 'sk_test_env',
    }
    expect(resolveStripeApiKey(env, dir)).toBe('sk_test_cli')
  })

  it('uses NUXT_STRIPE_SECRET_KEY from the environment before .env.local', async () => {
    await writeEnvLocal('NUXT_STRIPE_SECRET_KEY=sk_test_file\n')
    expect(resolveStripeApiKey({ NUXT_STRIPE_SECRET_KEY: 'sk_test_env' }, dir)).toBe('sk_test_env')
  })

  it('falls back to .env.local', async () => {
    await writeEnvLocal('OTHER=1\nNUXT_STRIPE_SECRET_KEY=sk_test_file\n')
    expect(resolveStripeApiKey({}, dir)).toBe('sk_test_file')
  })

  it('treats empty and blank values as absent', async () => {
    await writeEnvLocal('NUXT_STRIPE_SECRET_KEY=sk_test_file\n')
    const env: NodeJS.ProcessEnv = { STRIPE_API_KEY: '', NUXT_STRIPE_SECRET_KEY: '   ' }
    expect(resolveStripeApiKey(env, dir)).toBe('sk_test_file')
  })

  it('returns null when .env.local is absent and no variable is set', () => {
    expect(resolveStripeApiKey({}, dir)).toBeNull()
  })

  it('returns null when .env.local has no Stripe key', async () => {
    await writeEnvLocal('OTHER=1\n')
    expect(resolveStripeApiKey({}, dir)).toBeNull()
  })

  it.each(['sk_live_abc', 'rk_test_abc', 'whsec_abc'])('refuses the key "%s"', key => {
    expect(() => resolveStripeApiKey({ STRIPE_API_KEY: key }, dir)).toThrow(/sk_test_/)
  })

  it('refuses a non test key found in .env.local', async () => {
    await writeEnvLocal('NUXT_STRIPE_SECRET_KEY=sk_live_abc\n')
    expect(() => resolveStripeApiKey({}, dir)).toThrow(/sk_test_/)
  })

  it('never puts the refused key in the error message', () => {
    expect(() => resolveStripeApiKey({ STRIPE_API_KEY: 'sk_live_secretvalue' }, dir)).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('secretvalue') }),
    )
  })
})

describe('stripeCliEnv', () => {
  it('adds STRIPE_API_KEY and keeps the other variables', () => {
    expect(stripeCliEnv({ PATH: '/bin' }, 'sk_test_abc')).toEqual({
      PATH: '/bin',
      STRIPE_API_KEY: 'sk_test_abc',
    })
  })

  it('does not add STRIPE_API_KEY when the key is null', () => {
    expect(stripeCliEnv({ PATH: '/bin' }, null)).not.toHaveProperty('STRIPE_API_KEY')
  })

  it('does not modify the environment it receives', () => {
    const env: NodeJS.ProcessEnv = { PATH: '/bin' }
    stripeCliEnv(env, 'sk_test_abc')
    expect(env).not.toHaveProperty('STRIPE_API_KEY')
  })
})

describe('checkServerStripeKey', () => {
  it('refuses a server key that is not a test key', () => {
    expect(() => checkServerStripeKey({ NUXT_STRIPE_SECRET_KEY: 'sk_live_abc' }, dir)).toThrow(
      /sk_test_/,
    )
  })

  it('refuses a non test server key found in .env.local', async () => {
    await writeEnvLocal('NUXT_STRIPE_SECRET_KEY=sk_live_abc\n')
    expect(() => checkServerStripeKey({}, dir)).toThrow(/sk_test_/)
  })

  it('never puts the refused key in the error message', () => {
    expect(() =>
      checkServerStripeKey({ NUXT_STRIPE_SECRET_KEY: 'sk_live_secretvalue' }, dir),
    ).toThrow(expect.objectContaining({ message: expect.not.stringContaining('secretvalue') }))
  })

  it('returns null when the CLI key is missing', () => {
    expect(checkServerStripeKey({ NUXT_STRIPE_SECRET_KEY: 'sk_test_a' }, dir)).toBeNull()
  })

  it('returns null when the server key is missing', () => {
    expect(checkServerStripeKey({ STRIPE_API_KEY: 'sk_test_a' }, dir)).toBeNull()
  })

  it('returns null when both keys are equal', () => {
    const env: NodeJS.ProcessEnv = {
      STRIPE_API_KEY: 'sk_test_a',
      NUXT_STRIPE_SECRET_KEY: 'sk_test_a',
    }
    expect(checkServerStripeKey(env, dir)).toBeNull()
  })

  it('warns without any key text when the keys differ', async () => {
    await writeEnvLocal('NUXT_STRIPE_SECRET_KEY=sk_test_serverfile\n')
    const warning: string | null = checkServerStripeKey({ STRIPE_API_KEY: 'sk_test_cliabc' }, dir)
    expect(warning).toEqual(expect.any(String))
    expect(warning).not.toContain('sk_test_')
    expect(warning).not.toContain('serverfile')
    expect(warning).not.toContain('cliabc')
  })
})
