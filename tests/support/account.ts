import { deflateSync } from 'node:zlib'

import { THIONVILLE_ADDRESS } from './address'
import { rest } from './db'
import { readEnv } from './env'
import { sleep } from '../../scripts/test-process'

import type { AddressDetails } from '../../app/types/booking'

export type AccountCustomer = { id: string; email: string; firstName: string }

export type AccountBookingSeed = {
  customerId: string
  status: 'paid' | 'completed' | 'cancelled' | 'pending_payment' | 'expired'
  scheduledDate: string
  reminderSentAt?: string | null
  address?: AddressDetails
}

export type ProfileThrottle = {
  login_link_sent_at: string | null
  login_link_count: number
  login_link_window_start: string | null
  deletion_requested_at: string | null
}

const PHOTO_BUCKET = 'intervention-photos'

const crcTable: number[] = Array.from({ length: 256 }, (_, index) => {
  let value: number = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }
  return value >>> 0
})

const crc32 = (data: Buffer): number => {
  let crc = 0xffffffff
  for (const byte of data) {
    crc = (crcTable[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const pngChunk = (type: string, data: Buffer): Buffer => {
  const length: Buffer = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body: Buffer = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const checksum: Buffer = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, checksum])
}

/**
 * Builds a small valid single-colour PNG, so the browser really decodes the fixture photo.
 * @param color - Red, green and blue bytes
 * @returns PNG file content
 */
export const pngFixture = (color: [number, number, number]): Uint8Array => {
  const width = 80
  const height = 60
  const header: Buffer = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 2, 0, 0, 0], 8)
  const row: Buffer = Buffer.concat([
    Buffer.from([0]),
    Buffer.from(Array.from({ length: width }, () => color).flat()),
  ])
  const raw: Buffer = Buffer.concat(Array.from({ length: height }, () => row))
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      pngChunk('IHDR', header),
      pngChunk('IDAT', deflateSync(raw)),
      pngChunk('IEND', Buffer.alloc(0)),
    ]),
  )
}

const JPEG_FIXTURE_BASE64: string =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='

const publishableKey = (): string => readEnv('NUXT_PUBLIC_SUPABASE_KEY')

const supabaseUrl = (): string => readEnv('NUXT_PUBLIC_SUPABASE_URL')

/**
 * Creates an Auth user and its profile directly, like a booking does.
 * @param options - Email and first name of the customer
 * @returns Identifiers of the customer
 */
export const createCustomer = async (options: {
  email: string
  firstName: string
}): Promise<AccountCustomer> => {
  const created: Response = await rest('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email: options.email, email_confirm: true }),
  })
  const { id } = (await created.json()) as { id: string }
  await rest('/rest/v1/profiles', {
    method: 'POST',
    body: JSON.stringify({
      id,
      email: options.email,
      first_name: options.firstName,
      last_name: 'Compte',
      phone: '+33612345678',
    }),
  })
  return { id, email: options.email, firstName: options.firstName }
}

const bookingRow = (seed: AccountBookingSeed): Record<string, unknown> => {
  const address: AddressDetails = seed.address ?? THIONVILLE_ADDRESS
  return {
    customer_id: seed.customerId,
    scheduled_date: seed.scheduledDate,
    address: address.label,
    city: address.city,
    postcode: address.postcode,
    latitude: address.latitude,
    longitude: address.longitude,
    status: seed.status,
    plan: 'one_off',
    small_bin_count: 1,
    large_bin_count: 0,
    amount_total_cents: 1990,
    bins_ready_confirmed_at: new Date().toISOString(),
    reminder_sent_at: seed.reminderSentAt ?? null,
  }
}

/**
 * Inserts bookings in one request, bypassing the lead time rule and the day capacity.
 * @param seeds - Customer, status, date and optional address of each booking
 * @returns Booking identifiers, in the order of the seeds
 */
export const seedAccountBookings = async (seeds: AccountBookingSeed[]): Promise<string[]> => {
  const response: Response = await rest('/rest/v1/bookings', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(seeds.map(bookingRow)),
  })
  const rows = (await response.json()) as { id: string }[]
  if (!Array.isArray(rows) || rows.length !== seeds.length) {
    throw new Error('Account booking seed failed')
  }
  return rows.map(row => row.id)
}

/**
 * Inserts a booking for a customer, bypassing the lead time rule.
 * @param seed - Customer, status and intervention date
 * @returns Booking identifier
 */
export const seedAccountBooking = async (seed: AccountBookingSeed): Promise<string> => {
  const [id] = await seedAccountBookings([seed])
  if (!id) {
    throw new Error('Account booking seed failed')
  }
  return id
}

/**
 * Uploads a fixture photo to the intervention bucket and registers it in the database.
 * @param options - Booking and kind of photo
 * @returns Storage path of the object
 */
export const seedPhoto = async (options: {
  bookingId: string
  kind: 'before' | 'after'
}): Promise<string> => {
  const path = `${options.bookingId}/${options.kind}.jpg`
  const key: string = readEnv('NUXT_SUPABASE_SECRET_KEY')
  const upload: Response = await fetch(
    `${supabaseUrl()}/storage/v1/object/${PHOTO_BUCKET}/${path}`,
    {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'image/jpeg' },
      body: Buffer.from(JPEG_FIXTURE_BASE64, 'base64') as BodyInit,
    },
  )
  if (!upload.ok) {
    throw new Error(`Photo upload failed with ${upload.status}`)
  }
  await rest('/rest/v1/intervention_photos', {
    method: 'POST',
    body: JSON.stringify({
      booking_id: options.bookingId,
      kind: options.kind,
      storage_path: path,
    }),
  })
  return path
}

/**
 * Generates a one-time magic link token for an existing Auth user.
 * @param email - Email of the Auth user
 * @returns Hashed token usable in `/account/confirm#token_hash=…`
 */
export const generateTokenHash = async (email: string): Promise<string> => {
  const response: Response = await rest('/auth/v1/admin/generate_link', {
    method: 'POST',
    body: JSON.stringify({ type: 'magiclink', email }),
  })
  const body = (await response.json()) as { hashed_token?: string }
  if (!body.hashed_token) {
    throw new Error('generate_link returned no hashed token')
  }
  return body.hashed_token
}

type VerifiedSession = { access_token: string; refresh_token: string; expires_at: number }

/**
 * Exchanges a fresh magic link token for a customer session, as the browser does.
 * @param email - Email of the Auth user
 * @returns Session tokens
 */
export const openSession = async (email: string): Promise<VerifiedSession & { raw: string }> => {
  const tokenHash: string = await generateTokenHash(email)
  const response: Response = await fetch(`${supabaseUrl()}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: publishableKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: tokenHash }),
  })
  const raw: string = await response.text()
  if (!response.ok) {
    throw new Error(`verify failed with ${response.status}`)
  }
  return { ...(JSON.parse(raw) as VerifiedSession), raw }
}

/**
 * Returns the name of the Supabase session cookie, derived from the project reference.
 * @returns Cookie name
 */
export const sessionCookieName = (): string => {
  const projectRef: string = new URL(supabaseUrl()).hostname.split('.')[0] ?? ''
  return `sb-${projectRef}-auth-token`
}

/**
 * Encodes a raw Supabase session as the value of the session cookie.
 * @param raw - Raw JSON session returned by Supabase Auth
 * @returns Cookie value
 */
export const sessionCookieValue = (raw: string): string =>
  `base64-${Buffer.from(raw).toString('base64url')}`

/**
 * Builds the `Cookie` header carrying the Supabase session, as @nuxtjs/supabase reads it.
 * @param raw - Raw JSON session returned by Supabase Auth
 * @returns Cookie header value
 */
export const sessionCookie = (raw: string): string =>
  `${sessionCookieName()}=${sessionCookieValue(raw)}`

export const readProfileState = async (customerId: string): Promise<ProfileThrottle> => {
  const response: Response = await rest(
    `/rest/v1/profiles?select=login_link_sent_at,login_link_count,login_link_window_start,deletion_requested_at&id=eq.${customerId}`,
  )
  const [row] = (await response.json()) as ProfileThrottle[]
  if (!row) {
    throw new Error('Profile not found')
  }
  return row
}

/**
 * Polls the throttle columns of a test profile until a condition holds. The login route claims
 * the link in the background, after its answer, so the columns change a moment later.
 * @param customerId - Test customer identifier
 * @param isReady - Condition on the profile state
 * @param timeoutMs - Maximum wait
 * @returns The state when the condition holds, or the last state read when time ran out
 */
export const waitForProfileState = async (
  customerId: string,
  isReady: (state: ProfileThrottle) => boolean,
  timeoutMs: number = 8_000,
): Promise<ProfileThrottle> => {
  const deadline: number = Date.now() + timeoutMs
  let state: ProfileThrottle = await readProfileState(customerId)
  while (!isReady(state) && Date.now() < deadline) {
    await sleep(200)
    state = await readProfileState(customerId)
  }
  return state
}

/**
 * Sets throttle columns of one of the test profiles, to simulate elapsed time.
 * @param customerId - Test customer identifier
 * @param patch - Columns to set
 */
export const patchProfile = async (
  customerId: string,
  patch: Partial<ProfileThrottle>,
): Promise<void> => {
  await rest(`/rest/v1/profiles?id=eq.${customerId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

/**
 * Counts the Auth users with an email, reading every page of the admin list.
 * @param email - Email to look for
 * @returns Number of Auth users with this exact email
 */
export const countAuthUsersByEmail = async (email: string): Promise<number> => {
  const perPage = 200
  let page = 1
  let count = 0
  let received = perPage
  while (received === perPage) {
    const response: Response = await rest(`/auth/v1/admin/users?per_page=${perPage}&page=${page}`)
    const users: { email?: string }[] =
      ((await response.json()) as { users?: { email?: string }[] }).users ?? []
    count += users.filter(user => user.email === email).length
    received = users.length
    page += 1
  }
  return count
}

export const countProfilesByEmail = async (email: string): Promise<number> => {
  const response: Response = await rest(
    `/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(email)}`,
  )
  return ((await response.json()) as unknown[]).length
}

const PASSWORD_FOR_TESTS = 'E2e-pass-' + crypto.randomUUID()

/**
 * Opens a session by password, whose `amr` claim has no `otp` or `magiclink` entry. Stands for a
 * token that the 7 day rule must reject, since a token with an old timestamp cannot be forged
 * without the project JWT secret.
 * @param customerId - Test customer identifier
 * @param email - Email of the Auth user
 * @returns Session tokens and raw JSON
 */
export const openPasswordSession = async (
  customerId: string,
  email: string,
): Promise<VerifiedSession & { raw: string }> => {
  await rest(`/auth/v1/admin/users/${customerId}`, {
    method: 'PUT',
    body: JSON.stringify({ password: PASSWORD_FOR_TESTS }),
  })
  const response: Response = await fetch(`${supabaseUrl()}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: publishableKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD_FOR_TESTS }),
  })
  const raw: string = await response.text()
  if (!response.ok) {
    throw new Error(`password sign-in failed with ${response.status}`)
  }
  return { ...(JSON.parse(raw) as VerifiedSession), raw }
}
