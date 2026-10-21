import { describe, expect, it } from 'vitest'

import {
  ERROR_MESSAGE_CLASS,
  ERROR_TEXT_TONE_CLASS,
  INLINE_ERROR_CLASS,
} from '../../../app/constants/feedback'

describe('error feedback classes', () => {
  it('uses the red-700 text tone, AA on white', () => {
    expect(ERROR_TEXT_TONE_CLASS).toBe('text-red-700')
  })

  it.each([
    ['ERROR_MESSAGE_CLASS', ERROR_MESSAGE_CLASS],
    ['INLINE_ERROR_CLASS', INLINE_ERROR_CLASS],
  ])('%s contains text-red-700', (_name, classes) => {
    expect(classes).toContain('text-red-700')
  })
})
