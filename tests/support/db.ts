import { readEnv } from './env'
import { ADMIN_ROLE } from '../../app/constants/pro'
import { sleep } from '../../scripts/test-process'

export type BookingRow = {
  id: string
  status: string
  scheduled_date: string
  amount_total_cents: number
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  profiles: { email: string }
}

type Credentials = { url: string; key: string }

export type AuthUserRow = { id: string; email?: string; app_metadata?: { role?: string } }

export const E2E_EMAIL_PATTERN = /^(e2e\+.+@binovya\.test|delivered\+e2e-.+@resend\.dev)$/

const loadCredentials = (): Credentials => ({
  url: readEnv('NUXT_PUBLIC_SUPABASE_URL'),
  key: readEnv('NUXT_SUPABASE_SECRET_KEY'),
})

export const rest = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const { url, key } = loadCredentials()
  return fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  })
}

export const assertTestStripeKey = (): void => {
  if (!readEnv('NUXT_STRIPE_SECRET_KEY').startsWith('sk_test_')) {
    throw new Error('Refusing to run: Stripe key is not a test key')
  }
}

export const findBookings = async (email: string): Promise<BookingRow[]> => {
  const response: Response = await rest(
    `/rest/v1/bookings?select=id,status,scheduled_date,amount_total_cents,stripe_checkout_session_id,stripe_payment_intent_id,profiles!inner(email)&profiles.email=eq.${encodeURIComponent(email)}&order=created_at.asc`,
  )
  return (await response.json()) as BookingRow[]
}

export const countQuoteRequests = async (email: string): Promise<number> => {
  const response: Response = await rest(
    `/rest/v1/quote_requests?select=id&email=eq.${encodeURIComponent(email)}`,
  )
  return ((await response.json()) as unknown[]).length
}

export const countProfiles = async (email: string): Promise<number> => {
  const response: Response = await rest(
    `/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(email)}`,
  )
  return ((await response.json()) as unknown[]).length
}

export const readPrice = async (plan: string, small: number, large: number): Promise<number> => {
  const response: Response = await rest(
    `/rest/v1/price_grid?select=price_cents&plan=eq.${plan}&small_bin_count=eq.${small}&large_bin_count=eq.${large}`,
  )
  const rows = (await response.json()) as { price_cents: number }[]
  return rows[0]?.price_cents ?? -1
}

export const waitForStatus = async (
  email: string,
  status: string,
  timeoutMs = 25_000,
): Promise<BookingRow> => {
  const deadline: number = Date.now() + timeoutMs
  let last: BookingRow | undefined
  while (Date.now() < deadline) {
    const rows: BookingRow[] = await findBookings(email)
    last = rows.at(-1)
    if (last?.status === status) {
      return last
    }
    await sleep(1000)
  }
  throw new Error(`Booking of ${email} is "${last?.status ?? 'missing'}", expected "${status}"`)
}

const E2E_EMAIL_FILTERS: string[] = ['e2e%2B%25%40binovya.test', 'delivered%2Be2e-%25%40resend.dev']

const listE2eProfiles = async (): Promise<{ id: string; email: string }[]> => {
  const lists: { id: string; email: string }[][] = await Promise.all(
    E2E_EMAIL_FILTERS.map(async filter => {
      const response: Response = await rest(
        `/rest/v1/profiles?select=id,email&email=like.${filter}`,
      )
      return (await response.json()) as { id: string; email: string }[]
    }),
  )
  return lists.flat().filter(profile => E2E_EMAIL_PATTERN.test(profile.email))
}

/**
 * Lists every Auth user, page by page.
 * @returns Identifier, email and app metadata of each user
 */
export const listAuthUsers = async (): Promise<AuthUserRow[]> => {
  const perPage = 200
  const users: AuthUserRow[] = []
  for (let page = 1; ; page += 1) {
    const response: Response = await rest(`/auth/v1/admin/users?per_page=${perPage}&page=${page}`)
    const batch: AuthUserRow[] = ((await response.json()) as { users?: AuthUserRow[] }).users ?? []
    users.push(...batch)
    if (batch.length < perPage) {
      return users
    }
  }
}

/**
 * Lists the test Auth users still present, which the profile based cleanup cannot see when they
 * have no profile. Admins are left to `removeE2eAdmins`, which keeps the admin shared by a
 * Playwright run.
 * @returns Test accounts without the admin role
 */
export const listRemainingE2eUsers = async (): Promise<AuthUserRow[]> =>
  (await listAuthUsers()).filter(
    user => E2E_EMAIL_PATTERN.test(user.email ?? '') && user.app_metadata?.role !== ADMIN_ROLE,
  )

const removePhotoObjects = async (customerId: string): Promise<void> => {
  const response: Response = await rest(`/rest/v1/bookings?select=id&customer_id=eq.${customerId}`)
  const ids: string[] = ((await response.json()) as { id: string }[]).map(row => row.id)
  if (ids.length === 0) {
    return
  }
  await rest('/storage/v1/object/intervention-photos', {
    method: 'DELETE',
    body: JSON.stringify({
      prefixes: ids.flatMap(id =>
        ['before', 'after'].flatMap(kind => [`${id}/${kind}.png`, `${id}/${kind}.jpg`]),
      ),
    }),
  })
}

const removeE2eQuoteRequests = async (): Promise<void> => {
  await Promise.all(
    E2E_EMAIL_FILTERS.map(filter =>
      rest(`/rest/v1/quote_requests?email=like.${filter}`, { method: 'DELETE' }),
    ),
  )
}

export const cleanupE2eData = async (): Promise<{ bookings: number; users: number }> => {
  await removeE2eQuoteRequests()
  const profiles = await listE2eProfiles()
  const counts: number[] = await Promise.all(
    profiles.map(async profile => {
      await removePhotoObjects(profile.id)
      const deleted: Response = await rest(`/rest/v1/bookings?customer_id=eq.${profile.id}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=representation' },
      })
      const removed: number = ((await deleted.json()) as unknown[]).length
      await rest(`/auth/v1/admin/users/${profile.id}`, { method: 'DELETE' })
      return removed
    }),
  )
  const bookings: number = counts.reduce((total, count) => total + count, 0)
  const orphans: AuthUserRow[] = await listRemainingE2eUsers()
  await Promise.all(
    orphans.map(user => rest(`/auth/v1/admin/users/${user.id}`, { method: 'DELETE' })),
  )
  return { bookings, users: profiles.length + orphans.length }
}

export const ACTIVE_BOOKING_STATUSES: string[] = ['pending_payment', 'paid', 'completed']

const ACTIVE_STATUS_FILTER: string = `status=in.(${ACTIVE_BOOKING_STATUSES.join(',')})`

export const listActiveBookingDates = async (): Promise<Set<string>> => {
  const response: Response = await rest(
    `/rest/v1/bookings?select=scheduled_date&${ACTIVE_STATUS_FILTER}`,
  )
  const rows = (await response.json()) as { scheduled_date: string }[]
  return new Set(rows.map(row => row.scheduled_date))
}

/**
 * Counts the bookings occupying a day (pending payment, paid or completed).
 * @param date - Intervention date
 * @returns Number of active bookings on that date
 */
export const countActiveBookings = async (date: string): Promise<number> => {
  const response: Response = await rest(
    `/rest/v1/bookings?select=id&scheduled_date=eq.${date}&${ACTIVE_STATUS_FILTER}`,
  )
  return ((await response.json()) as unknown[]).length
}

export type BookingStripeRow = {
  status: string
  payment_method: string
  created_by_admin: boolean
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  stripe_invoice_id: string | null
  amount_total_cents: number
  expires_at: string | null
  customer_id: string
}

/**
 * Reads the payment columns of a booking.
 * @param bookingId - Booking identifier
 * @returns Status, payment method, Stripe identifiers, amount and hold end
 */
export const readBookingStripe = async (bookingId: string): Promise<BookingStripeRow> => {
  const response: Response = await rest(
    `/rest/v1/bookings?select=status,payment_method,created_by_admin,stripe_checkout_session_id,stripe_payment_intent_id,stripe_invoice_id,amount_total_cents,expires_at,customer_id&id=eq.${bookingId}`,
  )
  const [row] = (await response.json()) as BookingStripeRow[]
  if (!row) {
    throw new Error(`Booking ${bookingId} not found`)
  }
  return row
}

export type AdminBookingColumns = {
  admin_note: string | null
  admin_request_id: string | null
  price_source: string
  small_bin_count: number
  large_bin_count: number
  amount_total_cents: number
  payment_method: string
}

/**
 * Reads the admin-only columns and the price of a booking with the service role.
 * @param bookingId - Booking identifier
 * @returns Note, request id, price source, bins, amount and payment method
 */
export const readAdminBooking = async (bookingId: string): Promise<AdminBookingColumns> => {
  const response: Response = await rest(
    `/rest/v1/bookings?select=admin_note,admin_request_id,price_source,small_bin_count,large_bin_count,amount_total_cents,payment_method&id=eq.${bookingId}`,
  )
  const [row] = (await response.json()) as AdminBookingColumns[]
  if (!row) {
    throw new Error(`Booking ${bookingId} not found`)
  }
  return row
}
