import { E2E_EMAIL_PATTERN, listAuthUsers, rest, type AuthUserRow } from './db'
import { readEnv } from './env'
import { ADMIN_ROLE } from '../../app/constants/pro'
import { sleep } from '../../scripts/test-process'

import type { AccountCustomer } from './account'

/** Admin shared by the whole Playwright run: signed in once, its session reused by every test. */
export const SHARED_ADMIN_EMAIL: string = 'e2e+pro-shared-admin@binovya.test'

export type AdminThrottle = { sent_at: string; link_count: number; window_start: string }

export type DepotRow = { depot_latitude: number; depot_longitude: number }

/**
 * Creates a test admin directly in Auth, as the owner would: confirmed email, role in
 * `app_metadata`, no `profiles` row.
 * @param email - Address of the admin, `uniqueTestEmail('admin…')`
 * @returns Identifier and email of the admin
 */
export const createAdmin = async (email: string): Promise<AccountCustomer> => {
  const response: Response = await rest('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, email_confirm: true, app_metadata: { role: ADMIN_ROLE } }),
  })
  const { id } = (await response.json()) as { id?: string }
  if (!id) {
    throw new Error(`Admin creation failed with ${response.status}`)
  }
  return { id, email, firstName: 'Admin' }
}

/**
 * Deletes the admins created by tests: role admin AND an `e2e+…@binovya.test` address. The manual
 * dev admin and the demo customers never match. The throttle row goes with the user (cascade).
 * The admin shared by the Playwright run is kept unless asked, so a spec cleaning up its own
 * admins does not end the session of the others.
 * @param options - `includeShared` also deletes the shared admin, at the start and end of a run
 * @returns Number of admins deleted
 */
export const removeE2eAdmins = async (
  options: { includeShared?: boolean } = {},
): Promise<number> => {
  const admins: AuthUserRow[] = (await listAuthUsers()).filter(
    user =>
      user.app_metadata?.role === ADMIN_ROLE &&
      E2E_EMAIL_PATTERN.test(user.email ?? '') &&
      (options.includeShared === true || user.email !== SHARED_ADMIN_EMAIL),
  )
  await Promise.all(
    admins.map(admin => rest(`/auth/v1/admin/users/${admin.id}`, { method: 'DELETE' })),
  )
  return admins.length
}

/**
 * Reads the depot coordinates the planning must start and end from.
 * @returns Depot of the single `booking_settings` row
 */
export const readDepot = async (): Promise<DepotRow> => {
  const response: Response = await rest(
    '/rest/v1/booking_settings?select=depot_latitude,depot_longitude',
  )
  const [row] = (await response.json()) as DepotRow[]
  if (!row) {
    throw new Error('booking_settings row missing')
  }
  return row
}

/**
 * Sets the throttle row of a test admin, to simulate elapsed time.
 * @param adminId - Test admin identifier
 * @param patch - Columns of `admin_login_links` to set
 */
export const setAdminThrottle = async (
  adminId: string,
  patch: { sent_at?: string; link_count?: number; window_start?: string },
): Promise<void> => {
  await rest(`/rest/v1/admin_login_links?user_id=eq.${adminId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

/**
 * Reads the throttle row of a test admin.
 * @param adminId - Test admin identifier
 * @returns Row, or null when no link was ever claimed
 */
export const readAdminThrottle = async (adminId: string): Promise<AdminThrottle | null> => {
  const response: Response = await rest(
    `/rest/v1/admin_login_links?select=sent_at,link_count,window_start&user_id=eq.${adminId}`,
  )
  const [row] = (await response.json()) as AdminThrottle[]
  return row ?? null
}

/**
 * Calls PostgREST with a user session, so Row Level Security applies as for the browser.
 * @param accessToken - Access token of the session
 * @param path - REST path, such as `/rest/v1/bookings?select=id`
 * @returns The raw response
 */
export const restAs = (accessToken: string, path: string): Promise<Response> =>
  fetch(`${readEnv('NUXT_PUBLIC_SUPABASE_URL')}${path}`, {
    headers: {
      apikey: readEnv('NUXT_PUBLIC_SUPABASE_KEY'),
      Authorization: `Bearer ${accessToken}`,
    },
  })

/**
 * Polls the throttle row of a test admin until a condition holds. The route claims the link in
 * the background, after its answer, so the row changes a moment later.
 * @param adminId - Test admin identifier
 * @param isReady - Condition on the row, null while no link was ever claimed
 * @param timeoutMs - Maximum wait
 * @returns The row when the condition holds, or the last row read when time ran out
 */
export const waitForAdminThrottle = async (
  adminId: string,
  isReady: (row: AdminThrottle | null) => boolean,
  timeoutMs: number = 8_000,
): Promise<AdminThrottle | null> => {
  const deadline: number = Date.now() + timeoutMs
  let row: AdminThrottle | null = await readAdminThrottle(adminId)
  while (!isReady(row) && Date.now() < deadline) {
    await sleep(200)
    row = await readAdminThrottle(adminId)
  }
  return row
}
