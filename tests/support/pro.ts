import { createCustomer, openSession, sessionCookie, type AccountCustomer } from './account'
import { createAdmin } from './admin'
import { rest } from './db'
import { uniqueTestEmail } from './env'
import { parisDateFromToday } from './seed'
import { WEEKDAYS_MONDAY_FIRST } from '../../app/constants/booking'

import type { Database } from '../../app/types/database.types'
import type { ProWeekdayRule } from '../../app/types/proAvailability'

/** Offset of the first day tests may use for exceptions, far from the dates real customers book. */
export const FAR_OFFSET_DAYS: number = 300

/**
 * Returns a Paris date far enough ahead to stay away from real customers, within the 365 day
 * horizon of BINOVYA Pro.
 * @param index - Distinct index of the day, 0 to 60
 * @returns ISO date
 */
export const farDate = (index: number): string => parisDateFromToday(FAR_OFFSET_DAYS + index)

export type FarRange = { start: number; count: number }

/** One range of `farDate` indexes per test file, so that files never share a day. */
export const FAR_RANGES = {
  availabilityAccess: { start: 0, count: 4 },
  availabilityWrite: { start: 4, count: 8 },
  e2eAvailability: { start: 12, count: 4 },
  e2eReschedule: { start: 16, count: 10 },
  e2eOverrideDrafts: { start: 26, count: 8 },
  integrationReschedule: { start: 34, count: 12 },
  toMove: { start: 46, count: 6 },
  emailReschedule: { start: 52, count: 2 },
  e2eDatePicker: { start: 54, count: 4 },
} as const satisfies Record<string, FarRange>

/**
 * Returns the dates of a named range of `farDate` indexes.
 * @param range - Range owned by one test file
 * @returns ISO dates, one per index of the range
 */
export const farDates = (range: FarRange): string[] =>
  Array.from({ length: range.count }, (_unused: unknown, index: number) =>
    farDate(range.start + index),
  )

type OverridesTable = Database['public']['Tables']['availability_overrides']['Row']

type RulesTable = Database['public']['Tables']['availability_rules']['Row']

export type OverrideRow = Pick<
  OverridesTable,
  'date' | 'max_bookings' | 'sector_latitude' | 'sector_longitude' | 'sector_label' | 'note'
>

type RuleRow = Pick<RulesTable, 'weekday' | 'max_bookings'>

/**
 * Reads the stored exception of a date.
 * @param date - ISO date
 * @returns The row, or null when the day follows its weekday rule
 */
export const readOverride = async (date: string): Promise<OverrideRow | null> => {
  const response: Response = await rest(
    `/rest/v1/availability_overrides?select=date,max_bookings,sector_latitude,sector_longitude,sector_label,note&date=eq.${date}`,
  )
  const [row] = (await response.json()) as OverrideRow[]
  return row ?? null
}

/**
 * Deletes the exceptions of the given dates, the dates being the ones the test created.
 * @param dates - ISO dates
 */
export const removeOverrides = async (dates: string[]): Promise<void> => {
  if (dates.length === 0) {
    return
  }
  await rest(`/rest/v1/availability_overrides?date=in.(${dates.join(',')})`, { method: 'DELETE' })
}

/**
 * Reads the stored capacity of each weekday.
 * @returns Rules of the weekdays that have one, Sunday first
 */
export const readRules = async (): Promise<ProWeekdayRule[]> => {
  const response: Response = await rest('/rest/v1/availability_rules?select=weekday,max_bookings')
  const rows = (await response.json()) as RuleRow[]
  return rows
    .map(row => ({ weekday: row.weekday, maxBookings: row.max_bookings }))
    .sort((first, second) => first.weekday - second.weekday)
}

/**
 * Writes weekday capacities back, to restore what a test changed.
 * @param rules - Rules to write
 */
export const writeRules = async (rules: ProWeekdayRule[]): Promise<void> => {
  await rest('/rest/v1/availability_rules?on_conflict=weekday', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(
      rules.map(rule => ({ weekday: rule.weekday, max_bookings: rule.maxBookings })),
    ),
  })
}

type BookingDateRow = Pick<
  Database['public']['Tables']['bookings']['Row'],
  'scheduled_date' | 'reminder_sent_at'
>

/**
 * Restores the weekday capacities a test changed: writes the original rules back and deletes the
 * weekdays the test added.
 * @param original - Rules read before the test
 */
export const restoreRules = async (original: ProWeekdayRule[]): Promise<void> => {
  await writeRules(original)
  const stored = new Set(original.map(rule => rule.weekday))
  const added: number[] = WEEKDAYS_MONDAY_FIRST.filter(weekday => !stored.has(weekday))
  if (added.length > 0) {
    await rest(`/rest/v1/availability_rules?weekday=in.(${added.join(',')})`, { method: 'DELETE' })
  }
}

/**
 * Reads the intervention date and the reminder timestamp of a booking.
 * @param bookingId - Booking identifier
 * @returns Date and reminder timestamp
 */
export const readBookingDate = async (bookingId: string): Promise<BookingDateRow> => {
  const response: Response = await rest(
    `/rest/v1/bookings?select=scheduled_date,reminder_sent_at&id=eq.${bookingId}`,
  )
  const [row] = (await response.json()) as BookingDateRow[]
  if (!row) {
    throw new Error(`Booking ${bookingId} not found`)
  }
  return row
}

/**
 * Creates or replaces the exception of a date directly in the database, to prepare a scenario
 * without going through the admin routes.
 * @param date - ISO date
 * @param maxBookings - Capacity of the day, 0 to close it
 */
export const saveOverride = async (date: string, maxBookings: number): Promise<void> => {
  await rest('/rest/v1/availability_overrides?on_conflict=date', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ date, max_bookings: maxBookings }),
  })
}

export type ProSessions = { adminCookie: string; customerCookie: string }

/**
 * Creates a test admin and a test customer and opens a session for each.
 * @param tag - Short label put in the emails
 * @returns `Cookie` headers of both sessions
 */
export const openProSessions = async (tag: string): Promise<ProSessions> => {
  const admin: AccountCustomer = await createAdmin(uniqueTestEmail(`${tag}-admin`))
  const customer: AccountCustomer = await createCustomer({
    email: uniqueTestEmail(`${tag}-cust`),
    firstName: 'Cliente',
  })
  return {
    adminCookie: sessionCookie((await openSession(admin.email)).raw),
    customerCookie: sessionCookie((await openSession(customer.email)).raw),
  }
}
