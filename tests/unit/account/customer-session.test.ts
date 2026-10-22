import { describe, expect, it } from 'vitest'

import {
  isSignInExpired,
  readAccessTokenClaims,
  signInTimestamp,
} from '../../../app/utils/customerSession'

const NOW = 1_800_000_000

const DAY = 24 * 3600

type Claims = Parameters<typeof signInTimestamp>[0]

const malformedClaims = (value: unknown): Claims => value as Claims

const withAmr = (method: string, timestamp: number): Claims =>
  malformedClaims({ amr: [{ method, timestamp }] })

const encode = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url')

describe('isSignInExpired', () => {
  it('keeps a session signed in 6 days 23 hours ago', () => {
    expect(isSignInExpired(withAmr('otp', NOW - (7 * DAY - 3600)), NOW)).toBe(false)
  })

  it('keeps a session at exactly 7 days', () => {
    expect(isSignInExpired(withAmr('otp', NOW - 7 * DAY), NOW)).toBe(false)
  })

  it('ends a session 7 days and 1 second old', () => {
    expect(isSignInExpired(withAmr('otp', NOW - 7 * DAY - 1), NOW)).toBe(true)
  })

  it('accepts the magiclink method', () => {
    expect(isSignInExpired(withAmr('magiclink', NOW - 60), NOW)).toBe(false)
  })

  it('keeps a fresh sign-in', () => {
    expect(isSignInExpired(withAmr('otp', NOW), NOW)).toBe(false)
  })

  it.each([
    ['null claims', null],
    ['empty claims', {}],
    ['amr as a string', { amr: 'otp' }],
    ['empty amr', { amr: [] }],
    ['a password method', withAmr('password', NOW)],
    ['a timestamp as a string', { amr: [{ method: 'otp', timestamp: String(NOW) }] }],
    ['an entry without timestamp', { amr: [{ method: 'otp' }] }],
    ['a null entry', { amr: [null] }],
    ['a negative timestamp', withAmr('otp', -1)],
    ['an infinite timestamp', withAmr('otp', Number.POSITIVE_INFINITY)],
    ['a NaN timestamp', withAmr('otp', Number.NaN)],
  ])('treats %s as expired', (_label, claims) => {
    expect(isSignInExpired(malformedClaims(claims), NOW)).toBe(true)
  })
})

describe('isSignInExpired with a max age', () => {
  it('uses the given lifetime instead of the default one', () => {
    expect(isSignInExpired(withAmr('otp', NOW - 3 * DAY), NOW, 2 * DAY)).toBe(true)
    expect(isSignInExpired(withAmr('otp', NOW - DAY), NOW, 2 * DAY)).toBe(false)
  })

  it('keeps the exact limit and ends one second later', () => {
    expect(isSignInExpired(withAmr('otp', NOW - 2 * DAY), NOW, 2 * DAY)).toBe(false)
    expect(isSignInExpired(withAmr('otp', NOW - 2 * DAY - 1), NOW, 2 * DAY)).toBe(true)
  })

  it('still ends a session without sign-in time', () => {
    expect(isSignInExpired(malformedClaims({ amr: [] }), NOW, 30 * DAY)).toBe(true)
  })
})

describe('signInTimestamp', () => {
  it('returns the oldest valid entry', () => {
    const claims = malformedClaims({
      amr: [
        { method: 'otp', timestamp: 300 },
        { method: 'magiclink', timestamp: 100 },
        { method: 'password', timestamp: 1 },
      ],
    })
    expect(signInTimestamp(claims)).toBe(100)
  })

  it('ignores invalid entries', () => {
    expect(
      signInTimestamp(malformedClaims({ amr: [{ method: 'otp', timestamp: 'x' }, 'otp', null] })),
    ).toBeNull()
  })

  it('returns null without claims or amr', () => {
    expect(signInTimestamp(null)).toBeNull()
    expect(signInTimestamp(malformedClaims({}))).toBeNull()
  })
})

describe('readAccessTokenClaims', () => {
  it('decodes a base64url JWT payload', () => {
    const token = `${encode({ alg: 'ES256' })}.${encode({ sub: 'é+/?>', amr: [] })}.sig`
    expect(readAccessTokenClaims(token)).toEqual({ sub: 'é+/?>', amr: [] })
  })

  it('returns null for a token that is not a JWT', () => {
    expect(readAccessTokenClaims('bad')).toBeNull()
  })

  it('returns null for an undefined or empty token', () => {
    expect(readAccessTokenClaims(undefined)).toBeNull()
    expect(readAccessTokenClaims('')).toBeNull()
  })

  it('returns null when the payload is not JSON', () => {
    expect(readAccessTokenClaims(`a.${Buffer.from('nope').toString('base64url')}.c`)).toBeNull()
  })

  it('returns null when the payload is not an object', () => {
    expect(readAccessTokenClaims(`a.${encode('text')}.c`)).toBeNull()
    expect(readAccessTokenClaims(`a.${encode(null)}.c`)).toBeNull()
  })
})
