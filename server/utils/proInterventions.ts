import type { GeoPoint } from '@/types/booking'
import type { Database } from '@/types/database.types'
import type {
  ProBookingStatus,
  ProCustomer,
  ProIntervention,
  ProInterventionsFilters,
  ProInterventionsPage,
} from '@/types/pro'
import type { ProDayOverview } from '@/types/proAvailability'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  PRO_INTERVENTIONS_PAGE_SIZE,
  PRO_LIST_STATUSES,
  PRO_PLANNING_STATUSES,
} from '@/constants/pro'

type Tables = Database['public']['Tables']

type InterventionRow = Pick<
  Tables['bookings']['Row'],
  | 'id'
  | 'customer_id'
  | 'scheduled_date'
  | 'address'
  | 'latitude'
  | 'longitude'
  | 'plan'
  | 'small_bin_count'
  | 'large_bin_count'
  | 'household_collection_weekdays'
  | 'recycling_collection_weekdays'
  | 'amount_total_cents'
  | 'status'
>

type CustomerRow = Pick<Tables['profiles']['Row'], 'id' | 'first_name' | 'last_name' | 'phone'>

const INTERVENTION_COLUMNS =
  'id, customer_id, scheduled_date, address, latitude, longitude, plan, small_bin_count, large_bin_count, household_collection_weekdays, recycling_collection_weekdays, amount_total_cents, status'

const CUSTOMER_COLUMNS = 'id, first_name, last_name, phone'

const unavailable = (): Error =>
  createError({ statusCode: 500, statusMessage: 'Interventions unavailable' })

const isProStatus = (status: string): status is ProBookingStatus =>
  (PRO_LIST_STATUSES as string[]).includes(status)

const toCustomer = (row: CustomerRow): ProCustomer => ({
  firstName: row.first_name,
  lastName: row.last_name,
  phone: row.phone,
})

const loadCustomers = async (
  client: SupabaseClient<Database>,
  rows: InterventionRow[],
): Promise<Map<string, ProCustomer>> => {
  const ids: string[] = [...new Set(rows.map(row => row.customer_id))]
  if (ids.length === 0) {
    return new Map()
  }
  const { data, error } = await client.from('profiles').select(CUSTOMER_COLUMNS).in('id', ids)
  if (error) {
    throw unavailable()
  }
  return new Map(data.map(row => [row.id, toCustomer(row)]))
}

const toIntervention = (
  row: InterventionRow,
  customers: Map<string, ProCustomer>,
): ProIntervention | null =>
  isProStatus(row.status)
    ? {
        id: row.id,
        scheduledDate: row.scheduled_date,
        customer: customers.get(row.customer_id) ?? null,
        address: row.address,
        latitude: row.latitude,
        longitude: row.longitude,
        plan: row.plan,
        smallBinCount: row.small_bin_count,
        largeBinCount: row.large_bin_count,
        householdCollectionWeekdays: row.household_collection_weekdays,
        recyclingCollectionWeekdays: row.recycling_collection_weekdays,
        amountTotalCents: row.amount_total_cents,
        status: row.status,
        isToMove: false,
      }
    : null

const withCustomers = async (
  client: SupabaseClient<Database>,
  rows: InterventionRow[],
): Promise<ProIntervention[]> => {
  const customers: Map<string, ProCustomer> = await loadCustomers(client, rows)
  return rows
    .map(row => toIntervention(row, customers))
    .filter((intervention): intervention is ProIntervention => intervention !== null)
}

/**
 * Loads the paid and completed interventions of one day, grouped by postcode then address until
 * the round is optimised. Relies on RLS: the client must carry an admin session.
 * @param client - Supabase client of the logged-in admin
 * @param date - ISO calendar date of the day
 * @returns Interventions of the day with their customer
 * @throws 500 when the database cannot be read
 */
export const loadDayInterventions = async (
  client: SupabaseClient<Database>,
  date: string,
): Promise<ProIntervention[]> => {
  const { data, error } = await client
    .from('bookings')
    .select(INTERVENTION_COLUMNS)
    .eq('scheduled_date', date)
    .in('status', PRO_PLANNING_STATUSES)
    .order('postcode', { ascending: true })
    .order('address', { ascending: true })
  if (error) {
    throw unavailable()
  }
  return withCustomers(client, data)
}

const RANGE_NOT_SATISFIABLE: string = 'PGRST103'

type FilterableQuery<Query> = {
  in: (column: 'status', values: ProBookingStatus[]) => Query
  gte: (column: 'scheduled_date', value: string) => Query
  lte: (column: 'scheduled_date', value: string) => Query
}

const withFilters = <Query extends FilterableQuery<Query>>(
  query: Query,
  filters: ProInterventionsFilters,
): Query => {
  const byStatus: Query = query.in('status', filters.statuses)
  const fromDate: Query = filters.from ? byStatus.gte('scheduled_date', filters.from) : byStatus
  return filters.to ? fromDate.lte('scheduled_date', filters.to) : fromDate
}

const countInterventions = async (
  client: SupabaseClient<Database>,
  filters: ProInterventionsFilters,
): Promise<number> => {
  const { error, count } = await withFilters(
    client.from('bookings').select('id', { count: 'exact', head: true }),
    filters,
  )
  if (error) {
    throw unavailable()
  }
  return count ?? 0
}

/**
 * Loads one page of interventions matching the filters, sorted by date. A page past the last one
 * comes back empty with the total, so the browser can move to the last page. Relies on RLS: the
 * client must carry an admin session.
 * @param client - Supabase client of the logged-in admin
 * @param filters - Statuses and optional inclusive date range
 * @param page - Page number, starting at 1
 * @returns The page of interventions with the total number of matches
 * @throws 500 when the database cannot be read
 */
export const loadInterventionsPage = async (
  client: SupabaseClient<Database>,
  filters: ProInterventionsFilters,
  page: number,
): Promise<ProInterventionsPage> => {
  const start: number = (page - 1) * PRO_INTERVENTIONS_PAGE_SIZE
  const { data, error, count } = await withFilters(
    client.from('bookings').select(INTERVENTION_COLUMNS, { count: 'exact' }),
    filters,
  )
    .order('scheduled_date', { ascending: true })
    .order('created_at', { ascending: true })
    .range(start, start + PRO_INTERVENTIONS_PAGE_SIZE - 1)
  if (error?.code === RANGE_NOT_SATISFIABLE) {
    return {
      interventions: [],
      total: await countInterventions(client, filters),
      page,
      pageSize: PRO_INTERVENTIONS_PAGE_SIZE,
    }
  }
  if (error) {
    throw unavailable()
  }
  return {
    interventions: await withCustomers(client, data),
    total: count ?? 0,
    page,
    pageSize: PRO_INTERVENTIONS_PAGE_SIZE,
  }
}

/**
 * Reads the depot coordinates, start and end of every round. Relies on RLS: the client must
 * carry an admin session.
 * @param client - Supabase client of the logged-in admin
 * @returns Depot coordinates, or null when the settings row is missing
 * @throws 500 when the database cannot be read
 */
export const loadDepot = async (client: SupabaseClient<Database>): Promise<GeoPoint | null> => {
  const { data, error } = await client
    .from('booking_settings')
    .select('depot_latitude, depot_longitude')
    .maybeSingle()
  if (error) {
    throw unavailable()
  }
  return data ? { latitude: data.depot_latitude, longitude: data.depot_longitude } : null
}

/**
 * Lists the dates holding paid interventions, the only ones that can be marked to move.
 * @param interventions - Interventions of a page or a day
 * @returns Distinct ISO dates of the paid interventions
 */
export const paidInterventionDates = (interventions: ProIntervention[]): string[] => [
  ...new Set(
    interventions
      .filter(intervention => intervention.status === 'paid')
      .map(intervention => intervention.scheduledDate),
  ),
]

/**
 * Marks to move every paid intervention whose day is closed, by its weekday rule or by an
 * exception. A day holding more bookings than its capacity marks none.
 * @param interventions - Interventions of a page or a day
 * @param days - Overviews of the days of these interventions
 * @returns The interventions with their `isToMove` flag
 */
export const flagInterventionsToMove = (
  interventions: ProIntervention[],
  days: ProDayOverview[],
): ProIntervention[] => {
  const closedDates: Set<string> = new Set(days.filter(day => day.isClosed).map(day => day.date))
  return interventions.map(
    (intervention: ProIntervention): ProIntervention => ({
      ...intervention,
      isToMove: intervention.status === 'paid' && closedDates.has(intervention.scheduledDate),
    }),
  )
}
