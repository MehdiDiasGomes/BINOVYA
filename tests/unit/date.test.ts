import { describe, expect, it } from 'vitest'

import {
  addDays,
  formatLongDate,
  formatWeekday,
  parseIsoDate,
  toIsoDate,
} from '../../app/utils/date'

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
