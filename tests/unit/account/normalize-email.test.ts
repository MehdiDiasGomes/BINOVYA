import { describe, expect, it } from 'vitest'

import { normalizeEmail } from '../../../server/utils/emailAddress'

describe('normalizeEmail', () => {
  it('lower-cases the address', () => {
    expect(normalizeEmail('Ada@Example.TEST')).toBe('ada@example.test')
  })

  it('removes surrounding spaces', () => {
    expect(normalizeEmail('  ada@example.test \n')).toBe('ada@example.test')
  })

  it('treats two spellings of the same address alike', () => {
    expect(normalizeEmail(' ADA@example.test')).toBe(normalizeEmail('ada@EXAMPLE.test '))
  })

  it('answers an empty string for a missing value', () => {
    expect(normalizeEmail(undefined)).toBe('')
  })
})
