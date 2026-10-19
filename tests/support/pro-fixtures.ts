import { vi } from 'vitest'

import { THIONVILLE_ADDRESS } from './address'

import type { Database } from '../../app/types/database.types'
import type { ProIntervention } from '../../app/types/pro'
import type { ProDayOverview } from '../../app/types/proAvailability'
import type { SupabaseClient } from '@supabase/supabase-js'

export type HttpError = Error & { statusCode: number; data?: { code?: string } }

export type Result = { data: unknown; error: unknown }

export type OverviewRow = Database['public']['Functions']['admin_day_overview']['Returns'][number]

export const OK: Result = { data: null, error: null }

export const FAILURE: Result = { data: null, error: { message: 'boom' } }

/**
 * Stubs the Nitro `createError` global with an Error carrying the options.
 */
export const stubCreateError = (): void => {
  vi.stubGlobal('createError', (options: { statusCode: number; data?: { code?: string } }) =>
    Object.assign(new Error('http'), options),
  )
}

export const asClient = (client: unknown): SupabaseClient<Database> =>
  client as SupabaseClient<Database>

export const overviewRow = (day: string, patch: Partial<OverviewRow> = {}): OverviewRow => ({
  day,
  weekday: 6,
  capacity: 3,
  capacity_source: 'rule',
  is_closed: false,
  sector_latitude: null,
  sector_longitude: null,
  sector_label: null,
  note: null,
  active_count: 0,
  paid_count: 0,
  ...patch,
})

export const day = (date: string, patch: Partial<ProDayOverview> = {}): ProDayOverview => ({
  date,
  weekday: 6,
  capacity: 3,
  capacitySource: 'rule',
  isClosed: false,
  sector: null,
  sectorLabel: null,
  note: null,
  activeCount: 0,
  paidCount: 0,
  ...patch,
})

export const intervention = (
  id: string,
  date: string,
  status: ProIntervention['status'],
): ProIntervention => ({
  id,
  scheduledDate: date,
  customer: null,
  address: THIONVILLE_ADDRESS.label,
  latitude: THIONVILLE_ADDRESS.latitude,
  longitude: THIONVILLE_ADDRESS.longitude,
  plan: 'one_off',
  smallBinCount: 1,
  largeBinCount: 0,
  householdCollectionWeekdays: [],
  recyclingCollectionWeekdays: [],
  amountTotalCents: 1990,
  status,
  isToMove: false,
})

export const caught = async (action: () => Promise<unknown>): Promise<HttpError> => {
  try {
    await action()
  } catch (error) {
    return error as HttpError
  }
  throw new Error('Expected the call to throw')
}
