import { describe, expect, it } from 'vitest'

import { describedByIds } from '../../../app/utils/field'

describe('describedByIds', () => {
  it('returns undefined without hint nor error', () => {
    expect(describedByIds('email', '', '')).toBeUndefined()
  })

  it('returns the hint id alone', () => {
    expect(describedByIds('email', 'Hint', '')).toBe('email-hint')
  })

  it('returns the error id alone', () => {
    expect(describedByIds('email', '', 'Bad')).toBe('email-error')
  })

  it('returns both ids, hint first', () => {
    expect(describedByIds('login-email', 'Hint', 'Bad')).toBe('login-email-hint login-email-error')
  })
})
