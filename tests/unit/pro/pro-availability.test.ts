import { describe, expect, it } from 'vitest'

import {
  PRO_AVAILABILITY_HORIZON_DAYS,
  PRO_RESCHEDULE_ERROR_CODES,
  PRO_RESCHEDULE_FORCEABLE_CODES,
} from '../../../app/constants/pro'
import { addDaysToIsoDate, businessToday } from '../../../app/utils/date'
import {
  dayStatus,
  dayStatusTitle,
  daySectorText,
  hasDayOverride,
  isForceableRescheduleCode,
  isNotableDay,
  isOverrideDateEditable,
  isRescheduleErrorCode,
  overriddenReasonsText,
  weekdayCapacity,
} from '../../../app/utils/proAvailability'
import { day } from '../../support/pro-fixtures'

import type { ProDayOverview, ProWeekdayRule } from '../../../app/types/proAvailability'

const DATE = '2026-10-24'

const COUNTS = { activeCount: 1, paidCount: 1 }

const DAY: ProDayOverview = day(DATE, COUNTS)

const recordTranslation = (key: string, named: Record<string, unknown>, plural?: number): string =>
  `${key}|${JSON.stringify(named)}|${String(plural)}`

describe('hasDayOverride', () => {
  it('is false for a day that follows its weekday rule', () => {
    expect(hasDayOverride(DAY)).toBe(false)
  })

  it('is true for an own capacity, an imposed sector or a note', () => {
    expect(hasDayOverride(day(DATE, { ...COUNTS, capacitySource: 'override' }))).toBe(true)
    expect(
      hasDayOverride(day(DATE, { ...COUNTS, sector: { latitude: 49.3, longitude: 6.1 } })),
    ).toBe(true)
    expect(hasDayOverride(day(DATE, { ...COUNTS, note: 'Fête locale' }))).toBe(true)
  })
})

describe('isNotableDay', () => {
  it('ignores an ordinary day', () => {
    expect(isNotableDay(DAY)).toBe(false)
  })

  it('lists a day with an exception', () => {
    expect(isNotableDay(day(DATE, { ...COUNTS, note: 'x' }))).toBe(true)
  })

  it('lists a closed day that still holds paid interventions', () => {
    expect(isNotableDay(day(DATE, { ...COUNTS, isClosed: true, capacity: 0, paidCount: 2 }))).toBe(
      true,
    )
  })

  it('ignores a closed day without paid intervention', () => {
    expect(
      isNotableDay(
        day(DATE, { ...COUNTS, isClosed: true, capacity: 0, paidCount: 0, activeCount: 0 }),
      ),
    ).toBe(false)
  })

  it('lists a day holding more bookings than its capacity, not one that is exactly full', () => {
    expect(isNotableDay(day(DATE, { ...COUNTS, capacity: 2, activeCount: 3 }))).toBe(true)
    expect(isNotableDay(day(DATE, { ...COUNTS, capacity: 2, activeCount: 2 }))).toBe(false)
  })
})

describe('dayStatus', () => {
  it('is null for a normal day, also when exactly full', () => {
    expect(dayStatus(DAY)).toBeNull()
    expect(dayStatus(day(DATE, { ...COUNTS, capacity: 1, activeCount: 1 }))).toBeNull()
  })

  it('warns about a closed day that still holds paid interventions', () => {
    expect(dayStatus(day(DATE, { ...COUNTS, isClosed: true, capacity: 0, paidCount: 2 }))).toEqual({
      kind: 'closedWithBookings',
      tone: 'warning',
      count: 2,
    })
  })

  it('only informs about a closed day without paid intervention', () => {
    expect(dayStatus(day(DATE, { ...COUNTS, isClosed: true, capacity: 0, paidCount: 0 }))).toEqual({
      kind: 'closed',
      tone: 'info',
      count: 0,
    })
  })

  it('warns about a day over capacity with the active count', () => {
    expect(dayStatus(day(DATE, { ...COUNTS, capacity: 1, activeCount: 3 }))).toEqual({
      kind: 'overCapacity',
      tone: 'warning',
      count: 3,
    })
  })

  it('reports a closed day before the capacity excess', () => {
    expect(
      dayStatus(day(DATE, { ...COUNTS, isClosed: true, capacity: 0, activeCount: 2, paidCount: 0 }))
        ?.kind,
    ).toBe('closed')
  })
})

describe('dayStatusTitle', () => {
  it('is empty for a normal day', () => {
    expect(dayStatusTitle(DAY, 'fr-FR', recordTranslation)).toBe('')
  })

  it('pluralises a closed day on the paid count with a capitalised weekday', () => {
    const title = dayStatusTitle(
      day(DATE, { ...COUNTS, isClosed: true, capacity: 0, paidCount: 2 }),
      'fr-FR',
      recordTranslation,
    )
    expect(title).toBe(
      `pro.dayStatus.title.closedWithBookings|${JSON.stringify({ bookings: 2, capacity: 0, weekday: 'Samedi' })}|2`,
    )
  })

  it('pluralises an over-capacity day on the capacity', () => {
    const title = dayStatusTitle(
      day(DATE, { ...COUNTS, capacity: 2, activeCount: 4 }),
      'fr-FR',
      recordTranslation,
    )
    expect(title).toBe(
      `pro.dayStatus.title.overCapacity|${JSON.stringify({ bookings: 4, capacity: 2, weekday: 'Samedi' })}|2`,
    )
  })

  it('uses the locale for the weekday', () => {
    const title = dayStatusTitle(
      day(DATE, { ...COUNTS, isClosed: true, capacity: 0, paidCount: 0 }),
      'en',
      recordTranslation,
    )
    expect(title).toContain('"weekday":"Saturday"')
  })
})

describe('isOverrideDateEditable', () => {
  const today = '2026-10-17'

  it('accepts today and the last day of the horizon', () => {
    expect(isOverrideDateEditable(today, today)).toBe(true)
    expect(
      isOverrideDateEditable(addDaysToIsoDate(today, PRO_AVAILABILITY_HORIZON_DAYS), today),
    ).toBe(true)
  })

  it('refuses yesterday and the day after the horizon', () => {
    expect(isOverrideDateEditable('2026-10-16', today)).toBe(false)
    expect(
      isOverrideDateEditable(addDaysToIsoDate(today, PRO_AVAILABILITY_HORIZON_DAYS + 1), today),
    ).toBe(false)
  })

  it('accepts a future date', () => {
    expect(isOverrideDateEditable('2026-12-24', today)).toBe(true)
  })

  it('refuses a malformed or impossible date', () => {
    expect(isOverrideDateEditable('2026-02-30', today)).toBe(false)
    expect(isOverrideDateEditable('demain', today)).toBe(false)
    expect(isOverrideDateEditable('', today)).toBe(false)
  })

  it('follows the Paris day: 00:30 in Paris is already the next day while UTC is not', () => {
    const justAfterParisMidnight = businessToday(new Date('2026-10-17T22:30:00Z'))
    expect(justAfterParisMidnight).toBe('2026-10-18')
    expect(isOverrideDateEditable('2026-10-17', justAfterParisMidnight)).toBe(false)
    expect(isOverrideDateEditable('2026-10-18', justAfterParisMidnight)).toBe(true)
  })

  it('keeps the Paris day just before Paris midnight', () => {
    const justBeforeParisMidnight = businessToday(new Date('2026-10-17T21:59:00Z'))
    expect(justBeforeParisMidnight).toBe('2026-10-17')
    expect(isOverrideDateEditable('2026-10-17', justBeforeParisMidnight)).toBe(true)
  })
})

describe('weekdayCapacity', () => {
  const rules: ProWeekdayRule[] = [
    { weekday: 1, maxBookings: 3 },
    { weekday: 6, maxBookings: 0 },
  ]

  it('reads the capacity of the weekday', () => {
    expect(weekdayCapacity(rules, 1)).toBe(3)
    expect(weekdayCapacity(rules, 6)).toBe(0)
  })

  it('treats a weekday without a rule as closed', () => {
    expect(weekdayCapacity(rules, 3)).toBe(0)
    expect(weekdayCapacity([], 1)).toBe(0)
  })
})

describe('daySectorText', () => {
  const translate = (key: string, named?: Record<string, unknown>): string =>
    `${key}|${JSON.stringify(named)}`

  it('is empty without an imposed sector', () => {
    expect(daySectorText({ sector: null, sectorLabel: null }, 'fr-FR', translate)).toBe('')
  })

  it('shows the label chosen by the admin', () => {
    expect(
      daySectorText(
        { sector: { latitude: 49.1, longitude: 6.1 }, sectorLabel: 'Thionville (57100)' },
        'fr-FR',
        translate,
      ),
    ).toBe('Thionville (57100)')
  })

  it('falls back to the coordinates with four decimals when there is no label', () => {
    const text = daySectorText(
      { sector: { latitude: 49.359512345, longitude: 6.168 }, sectorLabel: null },
      'en',
      translate,
    )
    expect(text).toBe(
      `pro.availability.sectorValue|${JSON.stringify({ latitude: '49.3595', longitude: '6.168' })}`,
    )
  })
})

describe('overriddenReasonsText', () => {
  const translate = (key: string, named?: Record<string, unknown>): string =>
    named && 'reasons' in named ? `${key}:${String(named.reasons)}` : key

  it('is empty when nothing was forced', () => {
    expect(overriddenReasonsText([], 'en', translate)).toBe('')
  })

  it('joins the forced reasons as a list in the locale', () => {
    expect(overriddenReasonsText(['dayFull', 'outOfSector'], 'en', translate)).toBe(
      'pro.reschedule.forced:pro.reschedule.overridden.dayFull and pro.reschedule.overridden.outOfSector',
    )
  })

  it('keeps a single reason alone', () => {
    expect(overriddenReasonsText(['dayClosed'], 'fr-FR', translate)).toBe(
      'pro.reschedule.forced:pro.reschedule.overridden.dayClosed',
    )
  })
})

describe('isForceableRescheduleCode', () => {
  it.each(PRO_RESCHEDULE_FORCEABLE_CODES)('accepts %s', code => {
    expect(isForceableRescheduleCode(code)).toBe(true)
  })

  it.each(['tooFar', 'tooFrequent', 'pastDate', 'notFound', 'generic', '', undefined, null, 4])(
    'refuses %j',
    code => {
      expect(isForceableRescheduleCode(code)).toBe(false)
    },
  )
})

describe('isRescheduleErrorCode', () => {
  it.each(PRO_RESCHEDULE_ERROR_CODES)('accepts %s', code => {
    expect(isRescheduleErrorCode(code)).toBe(true)
  })

  it('covers every forceable code and the throttle codes', () => {
    expect(PRO_RESCHEDULE_ERROR_CODES).toEqual(
      expect.arrayContaining([...PRO_RESCHEDULE_FORCEABLE_CODES, 'tooFar', 'tooFrequent']),
    )
  })

  it.each(['generic', 'invalidAddress', '', undefined, null, {}])('refuses %j', code => {
    expect(isRescheduleErrorCode(code)).toBe(false)
  })
})
