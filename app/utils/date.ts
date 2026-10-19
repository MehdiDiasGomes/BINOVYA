import { BUSINESS_TIME_ZONE } from '@/constants/booking'

/**
 * Formats a date as a local `YYYY-MM-DD` string, without timezone conversion.
 * @param date - Date to format
 * @returns ISO calendar date
 */
export const toIsoDate = (date: Date): string => {
  const month: string = String(date.getMonth() + 1).padStart(2, '0')
  const day: string = String(date.getDate()).padStart(2, '0')
  const year: string = String(date.getFullYear()).padStart(4, '0')
  return `${year}-${month}-${day}`
}

/**
 * Reads a `YYYY-MM-DD` string as local midnight of that calendar date, years 0 to 99 included.
 * @param isoDate - ISO calendar date
 * @returns Local date at midnight
 */
export const parseIsoDate = (isoDate: string): Date => {
  const [year = 1970, month = 1, day = 1] = isoDate.split('-').map(Number)
  const date: Date = new Date(1970, 0, 1)
  date.setFullYear(year, month - 1, day)
  return date
}

export const addDays = (date: Date, days: number): Date => {
  const result: Date = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export const formatLongDate = (isoDate: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    parseIsoDate(isoDate),
  )

export const formatWeekday = (weekday: number, locale: string): string =>
  new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(new Date(2024, 0, 7 + weekday))

export const formatMediumDate = (isoDate: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(parseIsoDate(isoDate))

export const formatFullDate = (isoDate: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseIsoDate(isoDate))

/**
 * Returns the calendar date of an instant in a given time zone, whatever the server zone is.
 * @param instant - Moment to convert
 * @param timeZone - IANA time zone, such as `Europe/Paris`
 * @returns ISO calendar date in that zone
 */
export const isoDateInTimeZone = (instant: Date, timeZone: string): string => {
  const parts: Intl.DateTimeFormatPart[] = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find(entry => entry.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

/**
 * Returns the calendar date of an instant in the business time zone.
 * @param now - Moment to convert, the current instant by default
 * @returns ISO calendar date in the business time zone
 */
export const businessToday = (now: Date = new Date()): string =>
  isoDateInTimeZone(now, BUSINESS_TIME_ZONE)

/**
 * Adds a number of days to a calendar date, without timezone conversion.
 * @param isoDate - ISO calendar date
 * @param days - Number of days to add, negative to go back
 * @returns Resulting ISO calendar date
 */
export const addDaysToIsoDate = (isoDate: string, days: number): string =>
  toIsoDate(addDays(parseIsoDate(isoDate), days))
