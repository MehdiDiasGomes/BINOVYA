import type { AccountTranslate } from '@/types/account'
import type {
  ProDayOverview,
  ProDayStatus,
  ProPluralTranslate,
  ProRescheduleErrorCode,
  ProRescheduleForceableCode,
  ProWeekdayRule,
} from '@/types/proAvailability'

import {
  PRO_AVAILABILITY_HORIZON_DAYS,
  PRO_RESCHEDULE_ERROR_CODES,
  PRO_RESCHEDULE_FORCEABLE_CODES,
} from '@/constants/pro'
import { addDaysToIsoDate, formatWeekday } from '@/utils/date'
import { isIsoDate } from '@/utils/dateValidation'
import { capitalizeFirst } from '@/utils/text'

const SECTOR_FRACTION_DIGITS: number = 4

/**
 * Tells whether a day has an exception: its own capacity, an imposed sector or a note.
 * @param day - Overview of the day
 * @returns True when an exception overrides the weekday rule
 */
export const hasDayOverride = (day: ProDayOverview): boolean =>
  day.capacitySource === 'override' || day.sector !== null || day.note !== null

/**
 * Tells whether a day deserves a line in the BINOVYA Pro availability list: it has an exception,
 * or it is closed with paid interventions still on it, or it holds more bookings than its
 * capacity after a forced move.
 * @param day - Overview of the day
 * @returns True when the day must be listed
 */
export const isNotableDay = (day: ProDayOverview): boolean =>
  hasDayOverride(day) || (day.isClosed && day.paidCount > 0) || day.activeCount > day.capacity

/**
 * Sums up what a day of the BINOVYA Pro planning needs: closed with paid interventions still on
 * it, closed and empty, or holding more bookings than its capacity after a forced move.
 * @param day - Overview of the day
 * @returns Kind of status, tone (warning when the admin must act) and the count it is about, or
 * null for a normal day
 */
export const dayStatus = (day: ProDayOverview): ProDayStatus | null => {
  if (day.isClosed) {
    return day.paidCount > 0
      ? { kind: 'closedWithBookings', tone: 'warning', count: day.paidCount }
      : { kind: 'closed', tone: 'info', count: 0 }
  }
  return day.activeCount > day.capacity
    ? { kind: 'overCapacity', tone: 'warning', count: day.activeCount }
    : null
}

/**
 * Titles the status of a day, for the availability day cards and as the fallback of
 * `dayAlertTitle`. The plural form follows the capacity for an over capacity day and the number of
 * bookings otherwise.
 * @param day - Overview of the day
 * @param locale - BCP 47 locale of the page
 * @param t - Translation function of the page
 * @returns Title such as « Samedi fermé : 2 interventions à déplacer », empty for a normal day
 */
export const dayStatusTitle = (
  day: ProDayOverview,
  locale: string,
  t: ProPluralTranslate,
): string => {
  const status: ProDayStatus | null = dayStatus(day)
  if (!status) {
    return ''
  }
  return t(
    `pro.dayStatus.title.${status.kind}`,
    {
      bookings: status.count,
      capacity: day.capacity,
      weekday: capitalizeFirst(formatWeekday(day.weekday, locale), locale),
    },
    status.kind === 'overCapacity' ? day.capacity : status.count,
  )
}

/**
 * Counts the paid interventions a day forces the admin to move: all of them on a closed day, the
 * bookings beyond the capacity otherwise, at most the paid ones still to do.
 * @param day - Overview of the day
 * @returns Number of interventions to move, 0 when the day needs nothing
 */
export const dayMoveCount = (day: ProDayOverview): number => {
  if (day.isClosed) {
    return day.paidCount
  }
  return Math.max(0, Math.min(day.activeCount - day.capacity, day.paidCount))
}

/**
 * Titles the alert of a day of the BINOVYA Pro planning: the urgent number of interventions to
 * move when there is one, the status title of the day otherwise.
 * @param day - Overview of the day
 * @param locale - BCP 47 locale of the page
 * @param t - Translation function of the page
 * @returns Title such as « 2 interventions à déplacer d’urgence », empty for a normal day
 */
export const dayAlertTitle = (
  day: ProDayOverview,
  locale: string,
  t: ProPluralTranslate,
): string => {
  const moveCount: number = dayMoveCount(day)
  return moveCount > 0
    ? t('pro.dayStatus.urgent.title', { bookings: moveCount }, moveCount)
    : dayStatusTitle(day, locale, t)
}

/**
 * Tells whether the exception of a date can still be edited: from today to the end of the
 * availability horizon.
 * @param date - ISO date of the day
 * @param today - Business ISO date of today
 * @returns True when the override form accepts the date
 */
export const isOverrideDateEditable = (date: string, today: string): boolean =>
  isIsoDate(date) && date >= today && date <= addDaysToIsoDate(today, PRO_AVAILABILITY_HORIZON_DAYS)

/**
 * Reads the capacity of a weekday from the rules. A weekday without a rule is closed.
 * @param rules - Capacity of each weekday
 * @param weekday - Weekday number, 0 for Sunday
 * @returns Capacity of the weekday
 */
export const weekdayCapacity = (rules: ProWeekdayRule[], weekday: number): number =>
  rules.find(rule => rule.weekday === weekday)?.maxBookings ?? 0

const formatCoordinate = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: SECTOR_FRACTION_DIGITS }).format(value)

/**
 * Describes the imposed sector of a day by the address chosen for it, or by its coordinates with
 * four decimals (about ten metres) for an exception saved before addresses were stored.
 * @param day - Sector point and address label of the day
 * @param locale - BCP 47 locale of the page
 * @param t - Translation function of the page
 * @returns Address such as « 12 Rue de la Gare 57100 Thionville », coordinates, or an empty string
 * when the day has no imposed sector
 */
export const daySectorText = (
  day: Pick<ProDayOverview, 'sector' | 'sectorLabel'>,
  locale: string,
  t: AccountTranslate,
): string => {
  if (!day.sector) {
    return ''
  }
  return (
    day.sectorLabel ??
    t('pro.availability.sectorValue', {
      latitude: formatCoordinate(day.sector.latitude, locale),
      longitude: formatCoordinate(day.sector.longitude, locale),
    })
  )
}

/**
 * Lists the refusals the admin forced when moving an intervention, as a sentence to add to the
 * success announcement.
 * @param codes - Forced refusal codes, in the order the server checked them
 * @param locale - BCP 47 locale of the page
 * @param t - Translation function of the page
 * @returns Sentence such as « Forced: day full and out of sector. », empty when nothing was forced
 */
export const overriddenReasonsText = (
  codes: ProRescheduleForceableCode[],
  locale: string,
  t: AccountTranslate,
): string => {
  if (codes.length === 0) {
    return ''
  }
  const reasons: string[] = codes.map(code => t(`pro.reschedule.overridden.${code}`, {}))
  return t('pro.reschedule.forced', {
    reasons: new Intl.ListFormat(locale, { type: 'conjunction' }).format(reasons),
  })
}

/**
 * Tells whether a reschedule refusal can be overridden with « Force anyway ».
 * @param code - `data.code` of the refusal
 * @returns True for out of area, closed day, full day and out of sector
 */
export const isForceableRescheduleCode = (code: unknown): code is ProRescheduleForceableCode =>
  (PRO_RESCHEDULE_FORCEABLE_CODES as unknown[]).includes(code)

/**
 * Tells whether a value is a known reschedule refusal code, to pick its translated message.
 * @param code - `data.code` of the error
 * @returns True when the code has a message
 */
export const isRescheduleErrorCode = (code: unknown): code is ProRescheduleErrorCode =>
  (PRO_RESCHEDULE_ERROR_CODES as unknown[]).includes(code)
