import { readEnv } from './env'

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

export const sleep = (ms: number): Promise<void> =>
  new Promise<void>(resolve => setTimeout(resolve, ms))

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
  return { bookings, users: profiles.length }
}

export const listActiveBookingDates = async (): Promise<Set<string>> => {
  const response: Response = await rest(
    '/rest/v1/bookings?select=scheduled_date&status=in.(paid,completed,pending_payment)',
  )
  const rows = (await response.json()) as { scheduled_date: string }[]
  return new Set(rows.map(row => row.scheduled_date))
}
