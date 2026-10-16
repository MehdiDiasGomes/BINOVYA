import { describe, expect, it } from 'vitest'

import {
  loginEmailSchema,
  loginRequestSchema,
  validateLoginEmail,
} from '../../../app/utils/accountValidation'

const VALID = { email: 'ada@example.test', locale: 'fr', website: '' }

describe('loginEmailSchema', () => {
  it('trims and lowercases the address', () => {
    expect(loginEmailSchema.parse('  Ada.Lovelace@Example.TEST ')).toBe('ada.lovelace@example.test')
  })

  it('accepts a plus tag', () => {
    expect(loginEmailSchema.safeParse('delivered+e2e-x@resend.dev').success).toBe(true)
  })

  it.each(['', '   ', 'ada', 'ada@', '@example.test', 'ada @example.test', 'a@b@c.test'])(
    'rejects "%s"',
    value => {
      expect(loginEmailSchema.safeParse(value).success).toBe(false)
    },
  )

  it('accepts an address of exactly 254 characters', () => {
    const address = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(58)}.fr`
    expect(address.length).toBe(254)
    expect(loginEmailSchema.safeParse(address).success).toBe(true)
  })

  it('rejects an address longer than 254 characters', () => {
    expect(loginEmailSchema.safeParse(`${'a'.repeat(250)}@example.test`).success).toBe(false)
  })
})

describe('loginRequestSchema', () => {
  it('accepts a valid request and normalizes the email', () => {
    expect(loginRequestSchema.parse({ ...VALID, email: ' ADA@Example.test ' })).toEqual({
      email: 'ada@example.test',
      locale: 'fr',
      website: '',
    })
  })

  it('defaults the locale to fr and the honeypot to an empty string', () => {
    const parsed = loginRequestSchema.parse({ email: 'ada@example.test' })
    expect(parsed.locale).toBe('fr')
    expect(parsed.website).toBe('')
  })

  it('accepts the en locale', () => {
    expect(loginRequestSchema.parse({ ...VALID, locale: 'en' }).locale).toBe('en')
  })

  it.each(['de', 'FR', '', 'fr-FR'])('rejects the locale "%s"', locale => {
    expect(loginRequestSchema.safeParse({ ...VALID, locale }).success).toBe(false)
  })

  it('rejects a missing email', () => {
    expect(loginRequestSchema.safeParse({ locale: 'fr', website: '' }).success).toBe(false)
  })

  it('rejects a non-string email', () => {
    expect(loginRequestSchema.safeParse({ ...VALID, email: 42 }).success).toBe(false)
  })

  it('keeps a filled honeypot so the route can ignore the request', () => {
    expect(loginRequestSchema.parse({ ...VALID, website: 'http://spam.test' }).website).toBe(
      'http://spam.test',
    )
  })

  it('rejects a honeypot longer than 200 characters', () => {
    expect(loginRequestSchema.safeParse({ ...VALID, website: 'x'.repeat(201) }).success).toBe(false)
  })

  it('rejects a body that is not an object', () => {
    expect(loginRequestSchema.safeParse('ada@example.test').success).toBe(false)
  })
})

describe('validateLoginEmail', () => {
  it('returns null for a valid address', () => {
    expect(validateLoginEmail('ada@example.test')).toBeNull()
  })

  it('returns the translation key for an invalid address', () => {
    expect(validateLoginEmail('ada')).toBe('account.login.errors.email')
  })

  it('returns the translation key for an empty address', () => {
    expect(validateLoginEmail('')).toBe('account.login.errors.email')
  })
})
