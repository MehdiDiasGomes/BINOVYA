import { describe, expect, it } from 'vitest'

import { capitalizeFirst } from '../../../app/utils/text'

describe('capitalizeFirst', () => {
  it('uppercases the first letter of a French text and keeps the rest', () => {
    expect(capitalizeFirst('mercredi 18 novembre 2026', 'fr')).toBe('Mercredi 18 novembre 2026')
  })

  it('uppercases the first letter of an English text', () => {
    expect(capitalizeFirst('wednesday 18 November 2026', 'en')).toBe('Wednesday 18 November 2026')
  })

  it('uppercases an accented first letter', () => {
    expect(capitalizeFirst('évry', 'fr')).toBe('Évry')
  })

  it('uses the rules of the locale', () => {
    expect(capitalizeFirst('ice', 'tr')).toBe('İce')
  })

  it('leaves an already capitalised text unchanged', () => {
    expect(capitalizeFirst('Lundi', 'fr')).toBe('Lundi')
  })

  it('does not touch the rest of the text', () => {
    expect(capitalizeFirst('aBC dEF', 'en')).toBe('ABC dEF')
  })

  it('returns an empty string for an empty string', () => {
    expect(capitalizeFirst('', 'fr')).toBe('')
  })
})
