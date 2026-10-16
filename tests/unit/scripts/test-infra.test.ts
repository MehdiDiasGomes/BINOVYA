import { describe, expect, it } from 'vitest'

import { parseTestPort } from '../../../scripts/test-infra'

describe('parseTestPort', () => {
  it('defaults to 3001 when TEST_PORT is unset', () => {
    expect(parseTestPort(undefined)).toBe(3001)
  })

  it('reads a positive integer', () => {
    expect(parseTestPort('3002')).toBe(3002)
  })

  it.each(['abc', '0', '-1', '1.5', ''])('throws for %j', raw => {
    expect(() => parseTestPort(raw)).toThrow('TEST_PORT')
  })
})
