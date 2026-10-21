import { describe, expect, it } from 'vitest'

import {
  PRO_AVAILABILITY_HORIZON_DAYS,
  PRO_INTERVENTIONS_MAX_PAGE,
} from '../../../app/constants/pro'
import { addDaysToIsoDate, businessToday } from '../../../app/utils/date'
import { isIsoDate, isoDateSchema } from '../../../app/utils/dateValidation'
import {
  isBeyondProHorizon,
  isInvalidQuoteAmount,
  proCreateBookingSchema,
  proInterventionsQuerySchema,
  proPlanningQuerySchema,
} from '../../../server/utils/proSchemas'
import { THIONVILLE_ADDRESS } from '../../support/address'

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

  it.each(['all', 'pending_payment', 'paid', 'completed', 'cancelled', 'expired'])(
    'accepts the status %s',
    status => {
      expect(proInterventionsQuerySchema.parse({ status }).status).toBe(status)
    },
  )

  it.each(['PAID', 'unknown', ''])('rejects the status %j', status => {
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

describe('proCreateBookingSchema', () => {
  const today = businessToday()

  const valid = (patch: Record<string, unknown> = {}): Record<string, unknown> => ({
    requestId: crypto.randomUUID(),
    contact: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.test',
      phone: '+33612345678',
    },
    address: { ...THIONVILLE_ADDRESS, token: 'token' },
    plan: 'one_off',
    smallBinCount: 1,
    largeBinCount: 0,
    householdCollectionWeekdays: [],
    recyclingCollectionWeekdays: [],
    date: addDaysToIsoDate(today, 10),
    mode: 'offline',
    ...patch,
  })

  it('accepts a complete request and defaults force to false', () => {
    const parsed = proCreateBookingSchema.safeParse(valid())
    expect(parsed.success).toBe(true)
    expect(parsed.data?.force).toBe(false)
  })

  it.each(['payment_link', 'offline'])('accepts the mode %s', mode => {
    expect(proCreateBookingSchema.safeParse(valid({ mode })).success).toBe(true)
  })

  it.each(['cash', 'OFFLINE', '', null])('rejects the mode %j', mode => {
    expect(proCreateBookingSchema.safeParse(valid({ mode })).success).toBe(false)
  })

  it('accepts the last day of the horizon and rejects the next, flagged as too far', () => {
    expect(
      proCreateBookingSchema.safeParse(
        valid({ date: addDaysToIsoDate(today, PRO_AVAILABILITY_HORIZON_DAYS) }),
      ).success,
    ).toBe(true)
    const beyond = proCreateBookingSchema.safeParse(
      valid({ date: addDaysToIsoDate(today, PRO_AVAILABILITY_HORIZON_DAYS + 1) }),
    )
    expect(beyond.success).toBe(false)
    expect(beyond.error && isBeyondProHorizon(beyond.error)).toBe(true)
  })

  it('does not flag a malformed date as too far', () => {
    const parsed = proCreateBookingSchema.safeParse(valid({ date: '2026-02-30' }))
    expect(parsed.success).toBe(false)
    expect(parsed.error && isBeyondProHorizon(parsed.error)).toBe(false)
  })

  it('accepts 50 bins and rejects 51 or a negative count', () => {
    expect(proCreateBookingSchema.safeParse(valid({ smallBinCount: 50 })).success).toBe(true)
    expect(proCreateBookingSchema.safeParse(valid({ smallBinCount: 51 })).success).toBe(false)
    expect(proCreateBookingSchema.safeParse(valid({ largeBinCount: -1 })).success).toBe(false)
  })

  it('rejects a missing or non-uuid request id', () => {
    expect(proCreateBookingSchema.safeParse(valid({ requestId: undefined })).success).toBe(false)
    expect(proCreateBookingSchema.safeParse(valid({ requestId: 'abc' })).success).toBe(false)
  })

  it('defaults the quote amount and the note to null', () => {
    const parsed = proCreateBookingSchema.parse(valid())
    expect(parsed.quoteAmountCents).toBeNull()
    expect(parsed.note).toBeNull()
  })

  it.each([1, 1_000_000])('accepts the quote amount %i', quoteAmountCents => {
    expect(proCreateBookingSchema.safeParse(valid({ quoteAmountCents })).success).toBe(true)
  })

  it.each([0, 1_000_001, 12.5, -3])('rejects the quote amount %j', quoteAmountCents => {
    const parsed = proCreateBookingSchema.safeParse(valid({ quoteAmountCents }))
    expect(parsed.success).toBe(false)
    expect(parsed.error && isInvalidQuoteAmount(parsed.error)).toBe(true)
  })

  it('accepts a note of 500 characters, trims it and rejects 501', () => {
    expect(proCreateBookingSchema.safeParse(valid({ note: 'a'.repeat(500) })).success).toBe(true)
    expect(proCreateBookingSchema.safeParse(valid({ note: 'a'.repeat(501) })).success).toBe(false)
    expect(proCreateBookingSchema.parse(valid({ note: '  gate code  ' })).note).toBe('gate code')
  })

  it('turns a blank note into null', () => {
    expect(proCreateBookingSchema.parse(valid({ note: '   ' })).note).toBeNull()
  })

  it('rejects a non-boolean force', () => {
    expect(proCreateBookingSchema.safeParse(valid({ force: 'true' })).success).toBe(false)
  })

  it('rejects a missing contact and an invalid email', () => {
    expect(proCreateBookingSchema.safeParse(valid({ contact: undefined })).success).toBe(false)
    const contact = { firstName: 'Ada', lastName: 'L', email: 'nope', phone: '+33612345678' }
    expect(proCreateBookingSchema.safeParse(valid({ contact })).success).toBe(false)
  })

  it('rejects an unknown plan', () => {
    expect(proCreateBookingSchema.safeParse(valid({ plan: 'monthly' })).success).toBe(false)
  })
})
