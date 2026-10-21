import { signedAddress, THIONVILLE_ADDRESS } from './address'
import { sendApi, type ApiResult } from './api'
import { rest } from './db'
import { uniqueTestEmail } from './env'

import type { AddressDetails } from '../../app/types/booking'
import type { ProBookingMode } from '../../app/types/proCreate'

export type ProCreateOverrides = Partial<{
  email: string
  firstName: string
  lastName: string
  phone: string
  address: AddressDetails
  plan: string
  smallBinCount: number
  largeBinCount: number
  date: string
  mode: ProBookingMode
  force: boolean
  requestId: string
  quoteAmountCents: number
  note: string
}>

/**
 * Builds the body of `POST /api/pro/bookings` for a Thionville customer with one small bin.
 * @param date - Intervention date
 * @param overrides - Fields to replace
 * @returns Request body with a signed address
 */
export const proCreateBody = (
  date: string,
  overrides: ProCreateOverrides = {},
): Record<string, unknown> => ({
  requestId: overrides.requestId ?? crypto.randomUUID(),
  contact: {
    firstName: overrides.firstName ?? 'Creee',
    lastName: overrides.lastName ?? 'Par Admin',
    email: overrides.email ?? uniqueTestEmail('pro-create'),
    phone: overrides.phone ?? '+33612345678',
  },
  address: signedAddress(overrides.address ?? THIONVILLE_ADDRESS),
  plan: overrides.plan ?? 'one_off',
  smallBinCount: overrides.smallBinCount ?? 1,
  largeBinCount: overrides.largeBinCount ?? 0,
  householdCollectionWeekdays: [],
  recyclingCollectionWeekdays: [],
  date: overrides.date ?? date,
  mode: overrides.mode ?? 'offline',
  force: overrides.force ?? false,
  ...(overrides.quoteAmountCents === undefined
    ? {}
    : { quoteAmountCents: overrides.quoteAmountCents }),
  ...(overrides.note === undefined ? {} : { note: overrides.note }),
})

/**
 * Calls `POST /api/pro/bookings` as an admin.
 * @param cookie - Admin session cookie
 * @param body - Request body, see `proCreateBody`
 * @returns Status and parsed body
 */
export const createProBooking = (cookie: string, body: unknown): Promise<ApiResult> =>
  sendApi('POST', '/api/pro/bookings', { cookie, body })

/**
 * Calls `POST /api/pro/bookings/[id]/payment-link` as an admin.
 * @param cookie - Admin session cookie
 * @param bookingId - Booking whose link is sent again
 * @returns Status and parsed body
 */
export const resendProPaymentLink = (cookie: string, bookingId: string): Promise<ApiResult> =>
  sendApi('POST', `/api/pro/bookings/${bookingId}/payment-link`, { cookie })

export type ProfileNames = { first_name: string; last_name: string; phone: string }

/**
 * Reads the names stored in the profile of a customer.
 * @param email - Customer email
 * @returns First name, last name and phone, or null when there is no profile
 */
export const readProfileNames = async (email: string): Promise<ProfileNames | null> => {
  const response: Response = await rest(
    `/rest/v1/profiles?select=first_name,last_name,phone&email=eq.${encodeURIComponent(email)}`,
  )
  const [row] = (await response.json()) as ProfileNames[]
  return row ?? null
}
