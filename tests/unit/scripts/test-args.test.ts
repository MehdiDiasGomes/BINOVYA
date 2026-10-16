import { describe, expect, it } from 'vitest'

import {
  FORWARDED_WITH_SEVERAL_STEPS_MESSAGE,
  isTestStep,
  parseTestArgs,
  TEST_STEPS,
  unknownStepMessage,
} from '../../../scripts/test-args'

describe('parseTestArgs', () => {
  it('runs every step and forwards nothing when no argument is given', () => {
    expect(parseTestArgs([])).toEqual({ steps: TEST_STEPS, forwarded: [] })
  })

  it('returns the requested steps in TEST_STEPS order whatever the command line order', () => {
    expect(parseTestArgs(['e2e', 'unit']).steps).toEqual(['unit', 'e2e'])
  })

  it('keeps a spaced value as a single forwarded element', () => {
    const argv: string[] = ['e2e', '--grep', 'cancel on Stripe', '--repeat-each', '10']
    expect(parseTestArgs([...argv, '--trace', 'on'])).toEqual({
      steps: ['e2e'],
      forwarded: ['--grep', 'cancel on Stripe', '--repeat-each', '10', '--trace', 'on'],
    })
  })

  it('runs a single step alone with nothing forwarded', () => {
    expect(parseTestArgs(['integration'])).toEqual({ steps: ['integration'], forwarded: [] })
  })

  it('does not repeat a step named twice', () => {
    expect(parseTestArgs(['unit', 'unit']).steps).toEqual(['unit'])
  })

  it('forwards a path given after a single step', () => {
    expect(parseTestArgs(['integration', 'tests/integration/account'])).toEqual({
      steps: ['integration'],
      forwarded: ['tests/integration/account'],
    })
  })

  it('drops the explicit separator and keeps a step name after it as an argument', () => {
    expect(parseTestArgs(['e2e', '--', '--grep', 'unit'])).toEqual({
      steps: ['e2e'],
      forwarded: ['--grep', 'unit'],
    })
  })

  it('throws when arguments are forwarded without a step', () => {
    expect(() => parseTestArgs(['--grep', 'x'])).toThrow(FORWARDED_WITH_SEVERAL_STEPS_MESSAGE)
  })

  it('throws when arguments are forwarded with several steps', () => {
    expect(() => parseTestArgs(['unit', 'e2e', 'x'])).toThrow(FORWARDED_WITH_SEVERAL_STEPS_MESSAGE)
  })
})

describe('parseTestArgs with an unknown step', () => {
  it('throws the unknown step message for a mistyped step', () => {
    expect(() => parseTestArgs(['integation'])).toThrow(unknownStepMessage('integation'))
  })
})

describe('unknownStepMessage', () => {
  it.each(['integation', 'tests/integration/x'])(
    'names the token %s and the known steps',
    token => {
      const message: string = unknownStepMessage(token)
      expect(message).toContain(token)
      expect(message).toContain(TEST_STEPS.join(', '))
    },
  )
})

describe('isTestStep', () => {
  it.each(TEST_STEPS)('accepts %s', step => {
    expect(isTestStep(step)).toBe(true)
  })

  it.each(['integation', 'Unit', '', 'tests/integration/x'])('rejects %j', value => {
    expect(isTestStep(value)).toBe(false)
  })
})
