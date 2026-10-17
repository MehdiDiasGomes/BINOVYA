import { getDayOfWeek, parseDate } from '@internationalized/date'

import type { CalendarWeekStart } from '@/types/calendar'

const KNOWN_MONDAY: string = '2024-01-01'

/**
 * Gives the `weekStartsOn` value that makes a reka-ui calendar start its weeks on Monday, whatever
 * the first day of the week is in the locale.
 * @param locale - Locale of the calendar
 * @returns Index of Monday relative to the locale's first day of the week
 */
export const mondayWeekStart = (locale: string): CalendarWeekStart =>
  getDayOfWeek(parseDate(KNOWN_MONDAY), locale) as CalendarWeekStart
