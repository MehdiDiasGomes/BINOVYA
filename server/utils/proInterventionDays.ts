import type { CalendarVisibleRange } from '@/types/calendar'
import type { Database } from '@/types/database.types'
import type { ProInterventionDayCount } from '@/types/proInterventionDays'
import type { SupabaseClient } from '@supabase/supabase-js'

import { PRO_PLANNING_STATUSES } from '@/constants/pro'

const POSTGREST_MAX_ROWS: number = 1000

const MAX_DATE_BATCHES: number = 3

type RowWindow = { from: number; to: number }

const unavailable = (): Error =>
  createError({ statusCode: 500, statusMessage: 'Interventions unavailable' })

/**
 * Reads one window of the dates of the paid and completed interventions of a range.
 * @param client - Supabase client of the logged-in admin
 * @param range - Inclusive range of ISO dates
 * @param rows - Inclusive window of row offsets
 * @returns Dates in order, one per intervention
 * @throws 500 when the database cannot be read
 */
const loadDateRows = async (
  client: SupabaseClient<Database>,
  range: CalendarVisibleRange,
  rows: RowWindow,
): Promise<string[]> => {
  const { data, error } = await client
    .from('bookings')
    .select('scheduled_date')
    .in('status', PRO_PLANNING_STATUSES)
    .gte('scheduled_date', range.from)
    .lte('scheduled_date', range.to)
    .order('scheduled_date', { ascending: true })
    .order('id', { ascending: true })
    .range(rows.from, rows.to)
  if (error) {
    throw unavailable()
  }
  return data.map(row => row.scheduled_date)
}

/**
 * Reads the dates of the paid and completed interventions of a range, batch by batch.
 * @param client - Supabase client of the logged-in admin
 * @param range - Inclusive range of ISO dates
 * @param batch - Index of the batch to read, 0 for the first one
 * @returns Dates in order, one per intervention
 * @throws 500 when the database cannot be read or the range holds more than
 * `MAX_DATE_BATCHES * POSTGREST_MAX_ROWS` interventions
 */
const loadScheduledDates = async (
  client: SupabaseClient<Database>,
  range: CalendarVisibleRange,
  batch: number,
): Promise<string[]> => {
  const start: number = batch * POSTGREST_MAX_ROWS
  const end: number = start + POSTGREST_MAX_ROWS
  const dates: string[] = await loadDateRows(client, range, { from: start, to: end - 1 })
  if (dates.length < POSTGREST_MAX_ROWS) {
    return dates
  }
  if (batch + 1 < MAX_DATE_BATCHES) {
    return [...dates, ...(await loadScheduledDates(client, range, batch + 1))]
  }
  const extra: string[] = await loadDateRows(client, range, { from: end, to: end })
  if (extra.length > 0) {
    throw unavailable()
  }
  return dates
}

/**
 * Counts the paid and completed interventions of each day of a short range, reading only their
 * date. Relies on RLS: the client must carry an admin session.
 * @param client - Supabase client of the logged-in admin
 * @param range - Inclusive range of ISO dates
 * @returns One count per day holding at least one intervention, in date order
 * @throws 500 when the database cannot be read
 */
export const loadInterventionDayCounts = async (
  client: SupabaseClient<Database>,
  range: CalendarVisibleRange,
): Promise<ProInterventionDayCount[]> => {
  const dates: string[] = await loadScheduledDates(client, range, 0)
  const counts: Map<string, number> = dates.reduce(
    (result: Map<string, number>, date: string): Map<string, number> =>
      result.set(date, (result.get(date) ?? 0) + 1),
    new Map<string, number>(),
  )
  return [...counts].map(
    ([date, count]: [string, number]): ProInterventionDayCount => ({ date, count }),
  )
}
