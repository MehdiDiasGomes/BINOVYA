/**
 * Formats a date as a local `YYYY-MM-DD` string, without timezone conversion.
 * @param date - Date to format
 * @returns ISO calendar date
 */
export const toIsoDate = (date: Date): string => {
  const month: string = String(date.getMonth() + 1).padStart(2, '0')
  const day: string = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export const parseIsoDate = (isoDate: string): Date => {
  const [year = 1970, month = 1, day = 1] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
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
