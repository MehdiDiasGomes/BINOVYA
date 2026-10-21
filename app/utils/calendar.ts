import { getDayOfWeek, parseDate, toCalendarDate, type DateValue } from '@internationalized/date'

import type { CalendarDayAttributes, CalendarWeekStart } from '@/types/calendar'

import { formatFullDate } from '@/utils/date'

const KNOWN_MONDAY: string = '2024-01-01'

/**
 * Gives the `weekStartsOn` value that makes a reka-ui calendar start its weeks on Monday, whatever
 * the first day of the week is in the locale.
 * @param locale - Locale of the calendar
 * @returns Index of Monday relative to the locale's first day of the week
 */
export const mondayWeekStart = (locale: string): CalendarWeekStart =>
  getDayOfWeek(parseDate(KNOWN_MONDAY), locale) as CalendarWeekStart

/**
 * Builds the `aria-label` of a reka-ui calendar day that carries extra information.
 * @param day - Day of the cell
 * @param locale - Locale of the calendar
 * @param describe - Builds the full name from the long date, such as « lundi 19 octobre 2026 »
 * @returns Attributes to bind on `CalendarCellTrigger`
 */
export const calendarDayAttributes = (
  day: DateValue,
  locale: string,
  describe: (fullDate: string) => string,
): CalendarDayAttributes => ({
  'aria-label': describe(formatFullDate(toCalendarDate(day).toString(), locale)),
})
