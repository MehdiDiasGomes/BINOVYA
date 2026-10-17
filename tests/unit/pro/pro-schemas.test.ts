import { describe, expect, it } from 'vitest'

import { PRO_INTERVENTIONS_MAX_PAGE } from '../../../app/constants/pro'
import { isIsoDate, isoDateSchema } from '../../../app/utils/dateValidation'
import {
  proInterventionsQuerySchema,
  proPlanningQuerySchema,
} from '../../../server/utils/proSchemas'

describe('isIsoDate', () => {
  it('accepts a real calendar date', () => {
    expect(isIsoDate('2026-10-16')).toBe(true)
  })

  it('accepts 29 February of a leap year only', () => {
    expect(isIsoDate('2028-02-29')).toBe(true)
    expect(isIsoDate('2027-02-29')).toBe(false)
  })

  it.each(['2026-13-01', '2026-02-30', '2026-10-1', '16/10/2026', '2026-10-16T10:00:00Z', '', 'x'])(
    'rejects %j',
    value => {
      expect(isIsoDate(value)).toBe(false)
    },
  )
})

describe('isoDateSchema', () => {
  it('parses a valid date unchanged', () => {
    expect(isoDateSchema.parse('2026-10-16')).toBe('2026-10-16')
  })

  it('rejects a number', () => {
    expect(isoDateSchema.safeParse(20261016).success).toBe(false)
  })
})

describe('proPlanningQuerySchema', () => {
  it('accepts an empty query so the server uses today', () => {
    expect(proPlanningQuerySchema.parse({}).date).toBeUndefined()
  })

  it('accepts a valid date', () => {
    expect(proPlanningQuerySchema.parse({ date: '2026-10-16' }).date).toBe('2026-10-16')
  })

  it('rejects an invalid date', () => {
    expect(proPlanningQuerySchema.safeParse({ date: '2026-02-30' }).success).toBe(false)
  })
})

describe('proInterventionsQuerySchema', () => {
  it('defaults to every status and the first page', () => {
    expect(proInterventionsQuerySchema.parse({})).toEqual({ status: 'all', page: 1 })
  })

  it.each(['all', 'paid', 'completed', 'cancelled'])('accepts the status %s', status => {
    expect(proInterventionsQuerySchema.parse({ status }).status).toBe(status)
  })

  it.each(['pending_payment', 'expired', 'PAID', ''])('rejects the status %j', status => {
    expect(proInterventionsQuerySchema.safeParse({ status }).success).toBe(false)
  })

  it('accepts from equal to to', () => {
    const query = { from: '2026-10-16', to: '2026-10-16' }
    expect(proInterventionsQuerySchema.safeParse(query).success).toBe(true)
  })

  it('rejects from after to, on the field to', () => {
    const result = proInterventionsQuerySchema.safeParse({ from: '2026-10-17', to: '2026-10-16' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['to'])
  })

  it('accepts a range with only one bound', () => {
    expect(proInterventionsQuerySchema.safeParse({ from: '2026-10-17' }).success).toBe(true)
    expect(proInterventionsQuerySchema.safeParse({ to: '2026-10-17' }).success).toBe(true)
  })

  it('rejects an invalid date bound', () => {
    expect(proInterventionsQuerySchema.safeParse({ from: '2026-13-01' }).success).toBe(false)
  })

  it('coerces the page from the query string', () => {
    expect(proInterventionsQuerySchema.parse({ page: '3' }).page).toBe(3)
  })

  it.each(['1', String(PRO_INTERVENTIONS_MAX_PAGE)])('accepts the page bound %s', page => {
    expect(proInterventionsQuerySchema.safeParse({ page }).success).toBe(true)
  })

  it.each(['0', '-1', String(PRO_INTERVENTIONS_MAX_PAGE + 1), '1.5', 'abc'])(
    'rejects the page %s',
    page => {
      expect(proInterventionsQuerySchema.safeParse({ page }).success).toBe(false)
    },
  )
})
