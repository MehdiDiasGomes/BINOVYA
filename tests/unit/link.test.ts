import { describe, expect, it } from 'vitest'

import { isPlausibleEmail, parseSecureUrl } from '../../app/utils/link'

const CLEAR_SCHEME = ['http', '//'].join(':')

const SCRIPT_SCHEME = ['javascript', 'alert(1)'].join(':')

describe('parseSecureUrl', () => {
  it('accepts an https URL', () => {
    expect(parseSecureUrl('https://binovya.fr/booking')?.host).toBe('binovya.fr')
  })

  it('accepts http on localhost', () => {
    expect(parseSecureUrl(`${CLEAR_SCHEME}localhost:3000`)?.hostname).toBe('localhost')
  })

  it('accepts http on 127.0.0.1', () => {
    expect(parseSecureUrl(`${CLEAR_SCHEME}127.0.0.1:3000`)?.hostname).toBe('127.0.0.1')
  })

  it('refuses http on a public host', () => {
    expect(parseSecureUrl(`${CLEAR_SCHEME}binovya.fr`)).toBeNull()
  })

  it('refuses a javascript: URL', () => {
    expect(parseSecureUrl(SCRIPT_SCHEME)).toBeNull()
  })

  it('refuses a data: URL', () => {
    expect(parseSecureUrl('data:text/html,<b>x</b>')).toBeNull()
  })

  it('refuses a malformed URL', () => {
    expect(parseSecureUrl('not a url')).toBeNull()
  })

  it('refuses an empty string', () => {
    expect(parseSecureUrl('')).toBeNull()
  })
})

describe('isPlausibleEmail', () => {
  it('accepts a normal address', () => {
    expect(isPlausibleEmail('contact@binovya.fr')).toBe(true)
  })

  it('refuses a line break', () => {
    expect(isPlausibleEmail('a@b.fr\r\nBcc: x@y.fr')).toBe(false)
    expect(isPlausibleEmail('a@b.fr\n')).toBe(false)
  })

  it('refuses a space', () => {
    expect(isPlausibleEmail('a b@c.fr')).toBe(false)
  })

  it('refuses a missing @', () => {
    expect(isPlausibleEmail('contact.binovya.fr')).toBe(false)
  })

  it('refuses a double @', () => {
    expect(isPlausibleEmail('a@b@c.fr')).toBe(false)
  })

  it('refuses an empty string', () => {
    expect(isPlausibleEmail('')).toBe(false)
  })
})
