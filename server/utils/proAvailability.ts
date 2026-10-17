import type { Database } from '@/types/database.types'
import type { ProDayOverrideRequest, ProDayOverview, ProWeekdayRule } from '@/types/proAvailability'
import type { SupabaseClient } from '@supabase/supabase-js'

import { PRO_AVAILABILITY_MAX_RANGE_DAYS } from '@/constants/pro'
import { addDaysToIsoDate } from '@/utils/date'

type Tables = Database['public']['Tables']

type DayOverviewRow = Database['public']['Functions']['admin_day_overview']['Returns'][number]

type OverrideInsert = Tables['availability_overrides']['Insert']

type OverrideRow = Tables['availability_overrides']['Row']

type DateRange = {
  from: string
  to: string
}

const WEEKDAY_COUNT = 7

const OVERRIDE_COLUMNS = 'date, max_bookings, sector_latitude, sector_longitude, sector_label, note'

const unavailable = (): Error =>
  createError({ statusCode: 500, statusMessage: 'Availability unavailable' })

const saveFailed = (): Error =>
  createError({ statusCode: 500, statusMessage: 'Availability not saved' })

const toDayOverview = (row: DayOverviewRow): ProDayOverview => ({
  date: row.day,
  weekday: row.weekday,
  capacity: row.capacity,
  capacitySource: row.capacity_source,
  isClosed: row.is_closed,
  sector:
    row.sector_latitude !== null && row.sector_longitude !== null
      ? { latitude: row.sector_latitude, longitude: row.sector_longitude }
      : null,
  sectorLabel: row.sector_label,
  note: row.note,
  activeCount: row.active_count,
  paidCount: row.paid_count,
})

/**
 * Loads the effective capacity, exception and booking counts of every day of a range through
 * `admin_day_overview`, reserved to the service role.
 * @param client - Supabase client using the secret key, after an admin guard
 * @param from - First ISO date of the range
 * @param to - Last ISO date of the range, 400 days after `from` at most
 * @returns One overview per day, in date order
 * @throws 500 when the database cannot be read
 */
export const loadDayOverviews = async (
  client: SupabaseClient<Database>,
  from: string,
  to: string,
): Promise<ProDayOverview[]> => {
  const { data, error } = await client.rpc('admin_day_overview', { p_from: from, p_to: to })
  if (error) {
    throw unavailable()
  }
  return data.map(toDayOverview)
}

/**
 * Loads the overview of a single day, see `loadDayOverviews`.
 * @param client - Supabase client using the secret key, after an admin guard
 * @param date - ISO date of the day
 * @returns Overview of the day, or null when the database returned no row
 * @throws 500 when the database cannot be read
 */
export const loadDayOverview = async (
  client: SupabaseClient<Database>,
  date: string,
): Promise<ProDayOverview | null> => {
  const days: ProDayOverview[] = await loadDayOverviews(client, date, date)
  return days[0] ?? null
}

const toDateRanges = (dates: string[]): DateRange[] =>
  [...new Set(dates)].sort().reduce((ranges: DateRange[], date: string): DateRange[] => {
    const current: DateRange | undefined = ranges.at(-1)
    if (current && date <= addDaysToIsoDate(current.from, PRO_AVAILABILITY_MAX_RANGE_DAYS)) {
      current.to = date
    } else {
      ranges.push({ from: date, to: date })
    }
    return ranges
  }, [])

/**
 * Loads the overviews of scattered dates with one `admin_day_overview` call per span of
 * `PRO_AVAILABILITY_MAX_RANGE_DAYS` days, a single call for dates close together.
 * @param client - Supabase client using the secret key, after an admin guard
 * @param dates - ISO dates to cover, in any order, duplicates allowed
 * @returns Overviews covering every given date, plus the days between them
 * @throws 500 when the database cannot be read
 */
export const loadDayOverviewsOfDates = async (
  client: SupabaseClient<Database>,
  dates: string[],
): Promise<ProDayOverview[]> => {
  const overviews: ProDayOverview[][] = await Promise.all(
    toDateRanges(dates).map(
      (range: DateRange): Promise<ProDayOverview[]> =>
        loadDayOverviews(client, range.from, range.to),
    ),
  )
  return overviews.flat()
}

/**
 * Loads the capacity of each weekday. A weekday without a rule is closed.
 * @param client - Supabase client of the admin (RLS) or using the secret key
 * @returns Seven rules, Sunday (0) first
 * @throws 500 when the database cannot be read
 */
export const loadWeekdayRules = async (
  client: SupabaseClient<Database>,
): Promise<ProWeekdayRule[]> => {
  const { data, error } = await client.from('availability_rules').select('weekday, max_bookings')
  if (error) {
    throw unavailable()
  }
  return Array.from(
    { length: WEEKDAY_COUNT },
    (_, weekday): ProWeekdayRule => ({
      weekday,
      maxBookings: data.find(row => row.weekday === weekday)?.max_bookings ?? 0,
    }),
  )
}

/**
 * Saves the capacity of the given weekdays in one statement, so either every rule or none is
 * written.
 * @param client - Supabase client using the secret key, after `requireAdminForWrite`
 * @param rules - Capacity of each weekday to save
 * @throws 500 when the database refuses the write
 */
export const saveWeekdayRules = async (
  client: SupabaseClient<Database>,
  rules: ProWeekdayRule[],
): Promise<void> => {
  const { error } = await client.from('availability_rules').upsert(
    rules.map(rule => ({ weekday: rule.weekday, max_bookings: rule.maxBookings })),
    { onConflict: 'weekday' },
  )
  if (error) {
    throw saveFailed()
  }
}

/**
 * Removes the exception of a day, which then follows its weekday rule again. Removing a missing
 * exception succeeds.
 * @param client - Supabase client using the secret key, after `requireAdminForWrite`
 * @param date - ISO date of the day
 * @throws 500 when the database refuses the write
 */
export const deleteDayOverride = async (
  client: SupabaseClient<Database>,
  date: string,
): Promise<void> => {
  const { error } = await client.from('availability_overrides').delete().eq('date', date)
  if (error) {
    throw saveFailed()
  }
}

const isEmptyOverride = (row: OverrideRow): boolean =>
  row.max_bookings === null && row.sector_latitude === null && row.note === null

/**
 * Creates or updates the exception of a day: capacity (0 closes the day, null keeps the weekday
 * rule), note and imposed sector with its municipality label. A missing `sector` keeps the stored one,
 * null removes it. An exception left without any value is removed.
 * @param client - Supabase client using the secret key, after `requireAdminForWrite`
 * @param date - ISO date of the day
 * @param request - Values to store, the sector municipality already verified
 * @throws 500 when the database refuses the write
 */
export const saveDayOverride = async (
  client: SupabaseClient<Database>,
  date: string,
  request: ProDayOverrideRequest,
): Promise<void> => {
  const row: OverrideInsert = {
    date,
    max_bookings: request.maxBookings,
    note: request.note,
    ...(request.sector !== undefined && {
      sector_latitude: request.sector?.latitude ?? null,
      sector_longitude: request.sector?.longitude ?? null,
      sector_label: request.sector?.label ?? null,
    }),
  }
  const { data, error } = await client
    .from('availability_overrides')
    .upsert(row, { onConflict: 'date' })
    .select(OVERRIDE_COLUMNS)
    .single()
  if (error) {
    throw saveFailed()
  }
  if (isEmptyOverride(data)) {
    await deleteDayOverride(client, date)
  }
}
