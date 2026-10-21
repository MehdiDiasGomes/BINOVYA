import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createCustomer,
  openPasswordSession,
  openSession,
  seedAccountBooking,
  type AccountCustomer,
} from '../../support/account'
import { createAdmin, removeE2eAdmins, restAs } from '../../support/admin'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { uniqueTestEmail } from '../../support/env'

const DATE = '2041-07-10'

let owner: AccountCustomer
let stranger: AccountCustomer
let ownerBookingId: string
let strangerBookingId: string
let adminToken: string
let ownerToken: string
let passwordAdminToken: string

const idsOf = async (token: string, path: string): Promise<string[]> => {
  const response = await restAs(token, path)
  expect(response.ok).toBe(true)
  return ((await response.json()) as { id: string }[]).map(row => row.id)
}

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  owner = await createCustomer({ email: uniqueTestEmail('rls-owner'), firstName: 'Proprio' })
  stranger = await createCustomer({ email: uniqueTestEmail('rls-other'), firstName: 'Autre' })
  ownerBookingId = await seedAccountBooking({
    customerId: owner.id,
    status: 'paid',
    scheduledDate: DATE,
  })
  strangerBookingId = await seedAccountBooking({
    customerId: stranger.id,
    status: 'paid',
    scheduledDate: DATE,
  })
  const admin = await createAdmin(uniqueTestEmail('rls-admin'))
  const passwordAdmin = await createAdmin(uniqueTestEmail('rls-pwd'))
  adminToken = (await openSession(admin.email)).access_token
  ownerToken = (await openSession(owner.email)).access_token
  passwordAdminToken = (await openPasswordSession(passwordAdmin.id, passwordAdmin.email))
    .access_token
})

afterAll(async () => {
  await cleanupE2eData()
  await removeE2eAdmins()
})

describe('Row Level Security with an admin session', () => {
  it('sees the bookings of every customer', async () => {
    const ids = await idsOf(adminToken, `/rest/v1/bookings?select=id&scheduled_date=eq.${DATE}`)
    expect(ids.sort()).toEqual([ownerBookingId, strangerBookingId].sort())
  })

  it('sees the profiles of every customer', async () => {
    const ids = await idsOf(
      adminToken,
      `/rest/v1/profiles?select=id&id=in.(${owner.id},${stranger.id})`,
    )
    expect(ids.sort()).toEqual([owner.id, stranger.id].sort())
  })

  it('reads the depot settings', async () => {
    const response = await restAs(adminToken, '/rest/v1/booking_settings?select=depot_latitude')
    expect(((await response.json()) as unknown[]).length).toBe(1)
  })
})

describe('Row Level Security with a customer session', () => {
  it('sees only its own bookings', async () => {
    const ids = await idsOf(ownerToken, `/rest/v1/bookings?select=id&scheduled_date=eq.${DATE}`)
    expect(ids).toEqual([ownerBookingId])
  })

  it('cannot read the booking of another customer by id', async () => {
    expect(
      await idsOf(ownerToken, `/rest/v1/bookings?select=id&id=eq.${strangerBookingId}`),
    ).toEqual([])
  })

  it('sees only its own profile', async () => {
    const ids = await idsOf(
      ownerToken,
      `/rest/v1/profiles?select=id&id=in.(${owner.id},${stranger.id})`,
    )
    expect(ids).toEqual([owner.id])
  })

  it('cannot read the depot settings', async () => {
    const response = await restAs(ownerToken, '/rest/v1/booking_settings?select=depot_latitude')
    const rows = response.ok ? ((await response.json()) as unknown[]) : []
    expect(rows).toEqual([])
  })
})

describe('Row Level Security with an admin session opened by password', () => {
  it('sees no booking, no profile and no setting: a password session is never admin', async () => {
    expect(
      await idsOf(passwordAdminToken, `/rest/v1/bookings?select=id&scheduled_date=eq.${DATE}`),
    ).toEqual([])
    expect(
      await idsOf(
        passwordAdminToken,
        `/rest/v1/profiles?select=id&id=in.(${owner.id},${stranger.id})`,
      ),
    ).toEqual([])
    const settings = await restAs(
      passwordAdminToken,
      '/rest/v1/booking_settings?select=depot_latitude',
    )
    expect(settings.ok ? await settings.json() : []).toEqual([])
  })
})

describe('admin-only booking columns', () => {
  it.each(['admin_note', 'admin_request_id'])(
    'cannot be selected with a customer session (%s)',
    async column => {
      const response = await restAs(ownerToken, `/rest/v1/bookings?select=${column}`)
      expect(response.ok).toBe(false)
    },
  )

  it.each(['admin_note', 'admin_request_id'])(
    'cannot be selected with an admin session either (%s)',
    async column => {
      const response = await restAs(adminToken, `/rest/v1/bookings?select=${column}`)
      expect(response.ok).toBe(false)
    },
  )

  it('keeps the other columns readable', async () => {
    const response = await restAs(ownerToken, '/rest/v1/bookings?select=id,status')
    expect(response.ok).toBe(true)
  })
})

describe('admin_login_links table', () => {
  it('is not readable with an admin session: service role only', async () => {
    const response = await restAs(adminToken, '/rest/v1/admin_login_links?select=user_id')
    const rows = response.ok ? ((await response.json()) as unknown[]) : []
    expect(rows).toEqual([])
  })
})
