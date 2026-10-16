import { describe, expect, it } from 'vitest'

import {
  isPositiveInteger,
  localBaseUrl,
  STRIPE_LISTEN_PGREP_PATTERN,
} from '../../../scripts/test-process'

describe('STRIPE_LISTEN_PGREP_PATTERN', () => {
  const pattern: RegExp = new RegExp(STRIPE_LISTEN_PGREP_PATTERN)

  it.each(['stripe listen', 'stripe listen --forward-to x', '/opt/homebrew/bin/stripe listen'])(
    'matches the command %s',
    command => {
      expect(pattern.test(command)).toBe(true)
    },
  )

  it.each([
    'sh -c sleep 1; echo stripe listen',
    'notstripe listen',
    'stripe listener',
    'stripe login',
  ])('rejects the command %s', command => {
    expect(pattern.test(command)).toBe(false)
  })
})

describe('isPositiveInteger', () => {
  it.each([1, 42])('accepts %s', value => {
    expect(isPositiveInteger(value)).toBe(true)
  })

  it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1, '3', null])('rejects %s', value => {
    expect(isPositiveInteger(value)).toBe(false)
  })
})

describe('localBaseUrl', () => {
  it('builds the localhost URL of a port without trailing slash', () => {
    expect(localBaseUrl(3001)).toBe('http://localhost:3001')
  })
})
