import type { ProStatusFilter } from '@/types/pro'
import type { LocationQuery, LocationQueryRaw } from 'vue-router'

import { PRO_INTERVENTIONS_MAX_PAGE, PRO_STATUS_FILTERS } from '@/constants/pro'
import { isIsoDate } from '@/utils/dateValidation'

/**
 * Reads one key of a route query when it holds a single string.
 * @param query - Route query
 * @param key - Query key
 * @returns The string, or null when absent or repeated
 */
export const readQueryString = (query: LocationQuery, key: string): string | null => {
  const value: unknown = query[key]
  return typeof value === 'string' ? value : null
}

/**
 * Reads a date filter of the interventions list.
 * @param query - Route query
 * @param key - Query key
 * @param fallback - Value used when the key is absent
 * @returns The ISO date, an empty string when present but invalid, the fallback when absent
 */
export const readDate = (query: LocationQuery, key: string, fallback: string): string => {
  const value: string | null = readQueryString(query, key)
  if (value === null) {
    return fallback
  }
  return isIsoDate(value) ? value : ''
}

/**
 * Reads the status filter of the interventions list.
 * @param query - Route query
 * @returns A known status filter, `all` otherwise
 */
export const readStatusFilter = (query: LocationQuery): ProStatusFilter => {
  const value: string | null = readQueryString(query, 'status')
  return PRO_STATUS_FILTERS.find(filter => filter === value) ?? 'all'
}

/**
 * Reads the page of the interventions list.
 * @param query - Route query
 * @returns Page number from 1 to the maximum, 1 otherwise
 */
export const readListPage = (query: LocationQuery): number => {
  const page: number = Number(readQueryString(query, 'page'))
  return Number.isInteger(page) && page >= 1 && page <= PRO_INTERVENTIONS_MAX_PAGE ? page : 1
}

/**
 * Keeps only the valid filters and page of the interventions list from a query, so a link back to
 * the list never carries anything else. A present `from` is kept, emptied when invalid as the list
 * reads it: empty means « no start date », while a missing one means today.
 * @param query - Route query holding the list filters
 * @returns Status, dates and page of the list, each one only when valid
 */
export const proListQuery = (query: LocationQuery): LocationQueryRaw => {
  const status: string | null = readQueryString(query, 'status')
  const hasFrom: boolean = readQueryString(query, 'from') !== null
  const from: string = readDate(query, 'from', '')
  const to: string = readDate(query, 'to', '')
  const page: number = readListPage(query)
  return {
    ...(status !== null && readStatusFilter(query) === status ? { status } : {}),
    ...(hasFrom ? { from } : {}),
    ...(to ? { to } : {}),
    ...(page > 1 ? { page: String(page) } : {}),
  }
}
