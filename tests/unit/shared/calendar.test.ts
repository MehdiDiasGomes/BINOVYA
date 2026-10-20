import { parseDate } from '@internationalized/date'
import { describe, expect, it } from 'vitest'

import { calendarDayAttributes, mondayWeekStart } from '../../../app/utils/calendar'
import { formatFullDate } from '../../../app/utils/date'

describe('calendarDayAttributes', () => {
  it('labels the cell with the description built from the long French date', () => {
    const attributes = calendarDayAttributes(parseDate('2026-10-19'), 'fr', date => `${date} : 2`)
    expect(attributes['aria-label']).toBe(`${formatFullDate('2026-10-19', 'fr')} : 2`)
    expect(attributes['aria-label']).toContain('lundi 19 octobre 2026')
  })

  it('follows the locale', () => {
    const attributes = calendarDayAttributes(parseDate('2026-10-19'), 'en', date => date)
    expect(attributes['aria-label']).toBe('Monday, October 19, 2026')
  })
})

describe('mondayWeekStart', () => {
  it('is 0 where the week starts on Monday', () => {
    expect(mondayWeekStart('fr')).toBe(0)
  })
})
