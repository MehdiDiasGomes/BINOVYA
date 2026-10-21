import { describe, expect, it } from 'vitest'

import { redirectedEmailSubject, resolveMailRedirect } from '../../../server/utils/mailRedirect'

import type { MailRedirectEnvironment } from '../../../app/types/email'

const DEV_RESEND: MailRedirectEnvironment = {
  isDev: true,
  nodeEnv: 'development',
  transport: 'resend',
}

const REDIRECT_ADDRESS = 'me@example.com'

describe('resolveMailRedirect', () => {
  it('returns the address in development with the resend transport', () => {
    expect(resolveMailRedirect(REDIRECT_ADDRESS, DEV_RESEND)).toBe(REDIRECT_ADDRESS)
  })

  it('normalises the address like a login email', () => {
    expect(resolveMailRedirect('  Me@Example.COM ', DEV_RESEND)).toBe(REDIRECT_ADDRESS)
  })

  it('never redirects outside development', () => {
    expect(resolveMailRedirect(REDIRECT_ADDRESS, { ...DEV_RESEND, isDev: false })).toBeNull()
  })

  it('never redirects under Vitest (NODE_ENV test)', () => {
    expect(resolveMailRedirect(REDIRECT_ADDRESS, { ...DEV_RESEND, nodeEnv: 'test' })).toBeNull()
  })

  it.each(['outbox', 'console'] as const)('never redirects the %s transport', transport => {
    const environment = { ...DEV_RESEND, transport } as MailRedirectEnvironment
    expect(resolveMailRedirect(REDIRECT_ADDRESS, environment)).toBeNull()
  })

  it('never redirects when no transport is resolved', () => {
    expect(resolveMailRedirect(REDIRECT_ADDRESS, { ...DEV_RESEND, transport: null })).toBeNull()
  })

  it.each([undefined, null, '', '   ', 'not-an-email', 42, 'a@b'])(
    'ignores the invalid value %j',
    value => {
      expect(resolveMailRedirect(value, DEV_RESEND)).toBeNull()
    },
  )
})

describe('redirectedEmailSubject', () => {
  it('prefixes the subject with the real recipient', () => {
    expect(redirectedEmailSubject('Votre réservation', 'jane@example.com')).toBe(
      '[→ jane@example.com] Votre réservation',
    )
  })
})
