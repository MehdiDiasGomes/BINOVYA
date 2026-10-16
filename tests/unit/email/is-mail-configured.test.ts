import { afterEach, describe, expect, it, vi } from 'vitest'

import { isMailConfigured } from '../../../server/utils/mail'

type Config = { mailTransport: string; resendApiKey: string }

const stubConfig = (config: Config): void => {
  vi.stubGlobal('useRuntimeConfig', () => config)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('isMailConfigured with the outbox transport', () => {
  it('is true without a Resend key when NODE_ENV is test', () => {
    vi.stubEnv('NODE_ENV', 'test')
    stubConfig({ mailTransport: 'outbox', resendApiKey: '' })
    expect(isMailConfigured()).toBe(true)
  })

  it('is false outside development and tests, even with a Resend key', () => {
    vi.stubEnv('NODE_ENV', 'production')
    stubConfig({ mailTransport: 'outbox', resendApiKey: 're_test' })
    expect(isMailConfigured()).toBe(false)
  })
})

describe('isMailConfigured with the Resend transport', () => {
  it.each(['resend', ''])('is false without a key for the transport "%s"', transport => {
    stubConfig({ mailTransport: transport, resendApiKey: '' })
    expect(isMailConfigured()).toBe(false)
  })

  it.each(['resend', ''])('is true with a key for the transport "%s"', transport => {
    stubConfig({ mailTransport: transport, resendApiKey: 're_test' })
    expect(isMailConfigured()).toBe(true)
  })
})

describe('isMailConfigured with an unknown transport', () => {
  it('follows the Resend key outside development', () => {
    stubConfig({ mailTransport: 'smtp', resendApiKey: '' })
    expect(isMailConfigured()).toBe(false)
    stubConfig({ mailTransport: 'smtp', resendApiKey: 're_test' })
    expect(isMailConfigured()).toBe(true)
  })
})
