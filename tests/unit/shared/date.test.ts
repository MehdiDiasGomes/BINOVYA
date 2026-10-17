import { describe, expect, it } from 'vitest'

import {
  addDays,
  addDaysToIsoDate,
  businessToday,
  formatFullDate,
  formatLongDate,
  formatMediumDate,
  formatWeekday,
  isoDateInTimeZone,
  parseIsoDate,
  toIsoDate,
} from '../../../app/utils/date'

describe('formatLongDate', () => {
  it('formats a date in French', () => {
    expect(formatLongDate('2026-10-19', 'fr')).toBe('lundi 19 octobre')
  })

  it('formats a date in English', () => {
    expect(formatLongDate('2026-10-19', 'en')).toMatch(/^Monday,? (October 19|19 October)$/)
  })

  it('formats a leap day', () => {
    expect(formatLongDate('2028-02-29', 'fr')).toBe('mardi 29 février')
  })

  it('does not shift the day around midnight', () => {
    expect(formatLongDate('2026-12-31', 'fr')).toBe('jeudi 31 décembre')
  })
})

describe('formatWeekday', () => {
  it('names Sunday as 0 and Saturday as 6', () => {
    expect(formatWeekday(0, 'fr')).toBe('dimanche')
    expect(formatWeekday(6, 'fr')).toBe('samedi')
  })
})

describe('toIsoDate and parseIsoDate', () => {
  it('round-trips a date', () => {
    expect(toIsoDate(parseIsoDate('2026-03-08'))).toBe('2026-03-08')
  })

  it('pads month and day', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('addDays', () => {
  it('crosses a month boundary', () => {
    expect(toIsoDate(addDays(parseIsoDate('2026-10-31'), 1))).toBe('2026-11-01')
  })

  it('crosses a leap day', () => {
    expect(toIsoDate(addDays(parseIsoDate('2028-02-28'), 2))).toBe('2028-03-01')
  })

  it('does not mutate its input', () => {
    const start = parseIsoDate('2026-10-01')
    addDays(start, 5)
    expect(toIsoDate(start)).toBe('2026-10-01')
  })
})

describe('formatFullDate', () => {
  it('formats weekday, day, month and year in French', () => {
    expect(formatFullDate('2026-10-19', 'fr-FR')).toBe('lundi 19 octobre 2026')
  })

  it('formats a leap day', () => {
    expect(formatFullDate('2028-02-29', 'fr-FR')).toBe('mardi 29 février 2028')
  })

  it('does not shift the day on the last evening of the year', () => {
    expect(formatFullDate('2026-12-31', 'fr-FR')).toBe('jeudi 31 décembre 2026')
  })
})

describe('isoDateInTimeZone', () => {
  const PARIS = 'Europe/Paris'

  it('gives the next Paris day at 23:30 UTC in winter (UTC+1)', () => {
    expect(isoDateInTimeZone(new Date('2026-12-10T23:30:00Z'), PARIS)).toBe('2026-12-11')
  })

  it('keeps the same Paris day at 22:30 UTC in winter', () => {
    expect(isoDateInTimeZone(new Date('2026-12-10T22:30:00Z'), PARIS)).toBe('2026-12-10')
  })

  it('gives the next Paris day at 22:30 UTC in summer (UTC+2)', () => {
    expect(isoDateInTimeZone(new Date('2026-07-10T22:30:00Z'), PARIS)).toBe('2026-07-11')
  })

  it('keeps the same Paris day at 21:30 UTC in summer', () => {
    expect(isoDateInTimeZone(new Date('2026-07-10T21:30:00Z'), PARIS)).toBe('2026-07-10')
  })

  it('switches day at the exact summer-time midnight of 2026-03-29', () => {
    expect(isoDateInTimeZone(new Date('2026-03-28T22:59:59Z'), PARIS)).toBe('2026-03-28')
    expect(isoDateInTimeZone(new Date('2026-03-28T23:00:00Z'), PARIS)).toBe('2026-03-29')
  })

  it('switches day at the exact winter-time midnight of 2026-10-25', () => {
    expect(isoDateInTimeZone(new Date('2026-10-24T21:59:59Z'), PARIS)).toBe('2026-10-24')
    expect(isoDateInTimeZone(new Date('2026-10-24T22:00:00Z'), PARIS)).toBe('2026-10-25')
  })

  it('crosses the new year in Paris before UTC does', () => {
    expect(isoDateInTimeZone(new Date('2026-12-31T23:00:00Z'), PARIS)).toBe('2027-01-01')
  })

  it('returns the UTC date for the UTC zone', () => {
    expect(isoDateInTimeZone(new Date('2026-12-31T23:00:00Z'), 'UTC')).toBe('2026-12-31')
  })
})

describe('addDaysToIsoDate', () => {
  it('adds days across a month boundary', () => {
    expect(addDaysToIsoDate('2026-10-31', 2)).toBe('2026-11-02')
  })

  it('crosses the summer-time change without losing a day', () => {
    expect(addDaysToIsoDate('2026-03-28', 2)).toBe('2026-03-30')
  })

  it('crosses the winter-time change without gaining a day', () => {
    expect(addDaysToIsoDate('2026-10-24', 2)).toBe('2026-10-26')
  })

  it('crosses a leap day', () => {
    expect(addDaysToIsoDate('2028-02-28', 2)).toBe('2028-03-01')
  })

  it('subtracts days', () => {
    expect(addDaysToIsoDate('2026-01-01', -1)).toBe('2025-12-31')
  })
})

describe('formatMediumDate', () => {
  it('abbreviates the month in French', () => {
    expect(formatMediumDate('2026-10-16', 'fr')).toBe('16 oct. 2026')
  })

  it('follows the English order', () => {
    expect(formatMediumDate('2026-10-16', 'en')).toBe('Oct 16, 2026')
  })
})

describe('businessToday', () => {
  it('gives the next Paris day at 22:30 UTC in summer time', () => {
    expect(businessToday(new Date('2026-10-16T22:30:00Z'))).toBe('2026-10-17')
  })

  it('keeps the same Paris day at 22:30 UTC in winter time', () => {
    expect(businessToday(new Date('2026-12-10T22:30:00Z'))).toBe('2026-12-10')
  })

  it('defaults to the current instant', () => {
    expect(businessToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
