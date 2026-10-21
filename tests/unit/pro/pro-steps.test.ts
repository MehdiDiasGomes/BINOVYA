import { describe, expect, it } from 'vitest'

import { interventionMode, interventionProgressStatus } from '../../../app/utils/proSteps'
import { intervention } from '../../support/pro-fixtures'

import type { ProIntervention } from '../../../app/types/pro'

const TODAY = '2026-10-20'

const build = (patch: Partial<ProIntervention>): ProIntervention => ({
  ...intervention('b1', TODAY, 'paid'),
  ...patch,
})

describe('interventionProgressStatus', () => {
  it('shows an unpaid admin-created booking as awaiting payment', () => {
    expect(interventionProgressStatus(build({ status: 'pending_payment' }))).toBe('awaitingPayment')
  })

  it('shows a paid offline booking like any paid one', () => {
    expect(interventionProgressStatus(build({ paymentMethod: 'offline' }))).toBe('todo')
  })

  it('tells cancelled before anything else', () => {
    expect(interventionProgressStatus(build({ status: 'cancelled' }))).toBe('cancelled')
  })

  it('distinguishes a completion without photos', () => {
    expect(
      interventionProgressStatus(build({ status: 'completed', completedWithoutPhotos: true })),
    ).toBe('completedWithoutPhotos')
  })

  it('follows the photos of a paid booking', () => {
    expect(interventionProgressStatus(build({ photos: { before: true, after: false } }))).toBe(
      'beforeDone',
    )
    expect(interventionProgressStatus(build({ photos: { before: false, after: true } }))).toBe(
      'afterDone',
    )
    expect(interventionProgressStatus(build({ photos: { before: true, after: true } }))).toBe(
      'photosDone',
    )
  })
})

describe('interventionMode', () => {
  it('opens a pending payment read-only, even on its day', () => {
    expect(interventionMode(build({ status: 'pending_payment' }), TODAY)).toBe('awaitingPayment')
  })

  it('opens the steps for a paid intervention whose day has come', () => {
    expect(interventionMode(build({}), TODAY)).toBe('steps')
  })

  it('opens an offline paid intervention like an online one', () => {
    expect(interventionMode(build({ paymentMethod: 'offline' }), TODAY)).toBe('steps')
  })

  it('keeps a future paid intervention upcoming', () => {
    expect(interventionMode(build({ scheduledDate: '2026-10-21' }), TODAY)).toBe('upcoming')
  })

  it.each(['completed', 'cancelled'] as const)('opens a %s intervention as such', status => {
    expect(interventionMode(build({ status }), TODAY)).toBe(status)
  })
})
