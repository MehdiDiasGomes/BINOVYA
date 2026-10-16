import { describe, expect, it } from 'vitest'

import { describeBins } from '../../../app/templates/email/labels'

describe('describeBins', () => {
  it('writes one small bin in the singular', () => {
    expect(describeBins({ smallBinCount: 1, largeBinCount: 0 })).toBe('1 petit bac')
  })

  it('writes several small bins in the plural', () => {
    expect(describeBins({ smallBinCount: 2, largeBinCount: 0 })).toBe('2 petits bacs')
  })

  it('writes one large bin in the singular', () => {
    expect(describeBins({ smallBinCount: 0, largeBinCount: 1 })).toBe('1 grand bac')
  })

  it('writes several large bins in the plural', () => {
    expect(describeBins({ smallBinCount: 0, largeBinCount: 2 })).toBe('2 grands bacs')
  })

  it('joins both sizes with a plus sign', () => {
    expect(describeBins({ smallBinCount: 1, largeBinCount: 2 })).toBe('1 petit bac + 2 grands bacs')
    expect(describeBins({ smallBinCount: 3, largeBinCount: 1 })).toBe('3 petits bacs + 1 grand bac')
  })

  it('returns an empty text without bins', () => {
    expect(describeBins({ smallBinCount: 0, largeBinCount: 0 })).toBe('')
  })
})
