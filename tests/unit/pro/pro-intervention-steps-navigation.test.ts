import { describe, expect, it } from 'vitest'

import { PRO_HOME_PATH, PRO_INTERVENTIONS_PATH } from '../../../app/constants/pro'
import { PRO_RECREATE_QUERY } from '../../../app/constants/proCreate'
import { PRO_LIST_ORIGIN, PRO_ORIGIN_QUERY } from '../../../app/constants/proSteps'
import {
  initialInterventionStep,
  interventionBackRoute,
  interventionCardAction,
  interventionPageRoute,
  interventionSectionPath,
  interventionSteps,
  parseOriginQuery,
  parseStepQuery,
  photoStepNumber,
  recreateInterventionRoute,
} from '../../../app/utils/proSteps'
import { intervention } from '../../support/pro-fixtures'

const TODAY = '2026-10-20'

const NO_PHOTOS = { before: false, after: false }

describe('interventionSteps', () => {
  it('lists the four steps in order, the first one current', () => {
    expect(interventionSteps(1, NO_PHOTOS)).toEqual([
      { id: 'directions', number: 1, state: 'current' },
      { id: 'before', number: 2, state: 'todo' },
      { id: 'after', number: 3, state: 'todo' },
      { id: 'recap', number: 4, state: 'todo' },
    ])
  })

  it('marks the steps already left as done, which the stepper links back to', () => {
    const states = interventionSteps(3, { before: true, after: false }).map(step => step.state)
    expect(states).toEqual(['done', 'done', 'current', 'todo'])
  })

  it('marks a photo step left without photo as skipped', () => {
    const states = interventionSteps(4, { before: false, after: true }).map(step => step.state)
    expect(states).toEqual(['done', 'skipped', 'done', 'current'])
  })

  it('marks a photo step done as soon as its photo exists, even ahead of the current step', () => {
    expect(interventionSteps(1, { before: true, after: false })[1]?.state).toBe('done')
  })
})

describe('initialInterventionStep', () => {
  it('starts at the directions without photo', () => {
    expect(initialInterventionStep(NO_PHOTOS)).toBe(1)
  })

  it('resumes at the after photo once the before photo exists', () => {
    expect(initialInterventionStep({ before: true, after: false })).toBe(3)
  })

  it('resumes at the before photo when only the after photo exists', () => {
    expect(initialInterventionStep({ before: false, after: true })).toBe(2)
  })

  it('opens the recap once both photos exist', () => {
    expect(initialInterventionStep({ before: true, after: true })).toBe(4)
  })
})

describe('parseStepQuery', () => {
  it.each(['1', '2', '3', '4'])('reads the step %s', value => {
    expect(parseStepQuery(value)).toBe(Number(value))
  })

  it.each(['0', '5', '12', '-1', 'a', '', undefined, ['2']])('rejects %j', value => {
    expect(parseStepQuery(value)).toBeNull()
  })
})

describe('photoStepNumber', () => {
  it('gives the step of each photo', () => {
    expect(photoStepNumber('before')).toBe(2)
    expect(photoStepNumber('after')).toBe(3)
  })
})

describe('interventionCardAction', () => {
  it('starts a paid intervention of the day without photo', () => {
    expect(interventionCardAction(intervention('b1', TODAY, 'paid'), TODAY)).toBe('start')
  })

  it('continues once a photo exists', () => {
    const started = { ...intervention('b1', TODAY, 'paid'), photos: { before: true, after: false } }
    expect(interventionCardAction(started, TODAY)).toBe('continue')
  })

  it('only views a future or cancelled intervention', () => {
    expect(interventionCardAction(intervention('b1', '2026-10-25', 'paid'), TODAY)).toBe('view')
    expect(interventionCardAction(intervention('b2', TODAY, 'cancelled'), TODAY)).toBe('view')
  })
})

describe('interventionPageRoute', () => {
  it('carries the origin and only the valid filters of the list', () => {
    expect(
      interventionPageRoute('b 1', 'list', { status: 'paid', page: '2', junk: 'x', to: 'nope' }),
    ).toEqual({
      path: `${PRO_INTERVENTIONS_PATH}/b%201`,
      query: { status: 'paid', page: '2', [PRO_ORIGIN_QUERY]: PRO_LIST_ORIGIN },
    })
  })

  it('carries nothing from the planning', () => {
    expect(interventionPageRoute('b1', 'planning', { status: 'paid' })).toEqual({
      path: `${PRO_INTERVENTIONS_PATH}/b1`,
      query: {},
    })
  })
})

describe('interventionBackRoute', () => {
  it('restores the filters and page of the list', () => {
    expect(interventionBackRoute('list', '2026-10-20', { status: 'paid', page: '3' })).toEqual({
      path: PRO_INTERVENTIONS_PATH,
      query: { status: 'paid', page: '3' },
    })
  })

  it('goes back to the planning of the day of the intervention', () => {
    expect(interventionBackRoute('planning', '2026-10-20')).toEqual({
      path: PRO_HOME_PATH,
      query: { date: '2026-10-20' },
    })
  })

  it('goes back to the planning of today while the day is unknown', () => {
    expect(interventionBackRoute('planning', '')).toBe(PRO_HOME_PATH)
  })
})

describe('parseOriginQuery and interventionSectionPath', () => {
  it('reads the list origin and defaults to the planning', () => {
    expect(parseOriginQuery(PRO_LIST_ORIGIN)).toBe('list')
    expect(parseOriginQuery('anything')).toBe('planning')
    expect(parseOriginQuery(undefined)).toBe('planning')
  })

  it('gives the section of each origin', () => {
    expect(interventionSectionPath('list')).toBe(PRO_INTERVENTIONS_PATH)
    expect(interventionSectionPath('planning')).toBe(PRO_HOME_PATH)
  })
})

describe('recreateInterventionRoute', () => {
  it('links the prefilled form of an expired intervention only', () => {
    expect(
      recreateInterventionRoute(intervention('b1', TODAY, 'expired'))?.valueOf(),
    ).toMatchObject({
      query: { [PRO_RECREATE_QUERY]: 'b1' },
    })
    expect(recreateInterventionRoute(intervention('b2', TODAY, 'paid'))).toBeNull()
  })
})
