import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { PRO_AVAILABILITY_HORIZON_DAYS } from '../../../app/constants/pro'
import { addDaysToIsoDate } from '../../../app/utils/date'
import {
  createCustomer,
  openSession,
  seedAccountBooking,
  sessionCookie,
  type AccountBookingSeed,
  type AccountCustomer,
} from '../../support/account'
import {
  LYON_COMMUNE,
  PARIS_ADDRESS,
  signedMunicipality,
  THIONVILLE_COMMUNE,
} from '../../support/address'
import { createAdmin, removeE2eAdmins } from '../../support/admin'
import { sendApi, type ApiResult, type SendOptions } from '../../support/api'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { uniqueTestEmail } from '../../support/env'
import { mailsAfterSettling, waitForOneMail } from '../../support/outbox'
import { FAR_RANGES, farDates, readBookingDate, removeOverrides } from '../../support/pro'
import { parisDateFromToday } from '../../support/seed'

import type { ProRescheduleResponse } from '../../../app/types/proAvailability'

const DATES = farDates(FAR_RANGES.integrationReschedule)

const [
  SOURCE,
  OPEN_DAY,
  CLOSED_DAY,
  FULL_DAY,
  LYON_DAY,
  THIONVILLE_DAY,
  LOOP_DAY,
  PARIS_DAY,
  LOOP_START_DAY,
] = DATES as [string, string, string, string, string, string, string, string, string]

let adminCookie: string
let customerCookie: string

const overrideUrl = (date: string): string => `/api/pro/availability/overrides/${date}`

const openDay = (date: string, extra: Record<string, unknown> = {}): Promise<ApiResult> =>
  sendApi('PUT', overrideUrl(date), {
    cookie: adminCookie,
    body: { maxBookings: 5, note: null, ...extra },
  })

type Seeded = { id: string; email: string }

const seedPaid = async (
  tag: string,
  date: string,
  options: Partial<Pick<AccountBookingSeed, 'address' | 'status' | 'reminderSentAt'>> = {},
): Promise<Seeded> => {
  const customer: AccountCustomer = await createCustomer({
    email: uniqueTestEmail(`resched-${tag}`),
    firstName: 'Deplace',
  })
  const id = await seedAccountBooking({
    customerId: customer.id,
    status: options.status ?? 'paid',
    scheduledDate: date,
    address: options.address,
    reminderSentAt: options.reminderSentAt,
  })
  return { id, email: customer.email }
}

const reschedule = (
  bookingId: string,
  body: unknown,
  options: Pick<SendOptions, 'cookie' | 'origin'> = {},
): Promise<ApiResult> =>
  sendApi('POST', `/api/pro/bookings/${bookingId}/reschedule`, {
    cookie: 'cookie' in options ? options.cookie : adminCookie,
    body,
    origin: options.origin,
  })

const dateOf = async (booking: Seeded): Promise<string> =>
  (await readBookingDate(booking.id)).scheduled_date

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  await removeOverrides(DATES)
  const admin = await createAdmin(uniqueTestEmail('resched-admin'))
  const customer = await createCustomer({
    email: uniqueTestEmail('resched-cust'),
    firstName: 'Cliente',
  })
  adminCookie = sessionCookie((await openSession(admin.email)).raw)
  customerCookie = sessionCookie((await openSession(customer.email)).raw)
  await openDay(OPEN_DAY)
  await openDay(CLOSED_DAY, { maxBookings: 0 })
  await openDay(FULL_DAY, { maxBookings: 1 })
  await openDay(LYON_DAY, { sector: signedMunicipality(LYON_COMMUNE) })
  await openDay(THIONVILLE_DAY, { sector: signedMunicipality(THIONVILLE_COMMUNE) })
  await openDay(LOOP_DAY)
  await openDay(PARIS_DAY)
  await openDay(LOOP_START_DAY)
  await seedPaid('full-holder', FULL_DAY)
})

afterAll(async () => {
  await removeOverrides(DATES)
  await cleanupE2eData()
  await removeE2eAdmins()
})

describe('access rules of POST /api/pro/bookings/[id]/reschedule', () => {
  it('answers 401 without session', async () => {
    const booking = await seedPaid('anon', SOURCE)
    const result = await reschedule(booking.id, { date: OPEN_DAY }, { cookie: '' })
    expect(result.status).toBe(401)
    expect(await dateOf(booking)).toBe(SOURCE)
  })

  it('answers 403 to a customer session, even for the customer own booking', async () => {
    const booking = await seedPaid('cust', SOURCE)
    const result = await reschedule(booking.id, { date: OPEN_DAY }, { cookie: customerCookie })
    expect(result.status).toBe(403)
    expect(await dateOf(booking)).toBe(SOURCE)
  })

  it('answers 403 forbiddenOrigin without an Origin header or with a foreign one', async () => {
    const booking = await seedPaid('origin', SOURCE)
    const missing = await reschedule(booking.id, { date: OPEN_DAY }, { origin: null })
    expect(missing.status).toBe(403)
    expect(missing.body.data?.code).toBe('forbiddenOrigin')
    const foreign = await reschedule(
      booking.id,
      { date: OPEN_DAY },
      { origin: 'https://evil.example.com' },
    )
    expect(foreign.status).toBe(403)
    expect(await dateOf(booking)).toBe(SOURCE)
  })

  it('answers 413 to a body over 1 KB', async () => {
    const booking = await seedPaid('big', SOURCE)
    const result = await reschedule(booking.id, { date: OPEN_DAY, padding: 'x'.repeat(2000) })
    expect(result.status).toBe(413)
  })
})

describe('a move to an available day', () => {
  it('changes the date, resets the reminder and writes a mail to the customer', async () => {
    const booking = await seedPaid('ok', SOURCE, { reminderSentAt: new Date().toISOString() })
    const result = await reschedule(booking.id, { date: OPEN_DAY })
    expect(result.status).toBe(200)
    expect(result.body as unknown as ProRescheduleResponse).toEqual({
      bookingId: booking.id,
      oldDate: SOURCE,
      newDate: OPEN_DAY,
      overriddenCodes: [],
    })
    const row = await readBookingDate(booking.id)
    expect(row.scheduled_date).toBe(OPEN_DAY)
    expect(row.reminder_sent_at).toBeNull()
    const mail = await waitForOneMail({ to: booking.email, subjectIncludes: 'déplacée' })
    expect(mail.to).toBe(booking.email)
  })

  it('moves a booking to a day whose sector is its own commune without force', async () => {
    const booking = await seedPaid('sector-ok', SOURCE)
    const result = await reschedule(booking.id, { date: THIONVILLE_DAY })
    expect(result.status).toBe(200)
    expect(await dateOf(booking)).toBe(THIONVILLE_DAY)
  })

  it('treats force as a no-op when nothing is refused', async () => {
    const booking = await seedPaid('force-noop', SOURCE)
    const result = await reschedule(booking.id, { date: OPEN_DAY, force: true })
    expect(result.status).toBe(200)
    expect((result.body as unknown as ProRescheduleResponse).overriddenCodes).toEqual([])
  })
})

describe('a move refused for a day that does not fit', () => {
  it('refuses a closed day with dayClosed, then moves it with force and reports it', async () => {
    const booking = await seedPaid('closed', SOURCE)
    const refused = await reschedule(booking.id, { date: CLOSED_DAY })
    expect(refused.status).toBe(409)
    expect(refused.body.data?.code).toBe('dayClosed')
    expect(await dateOf(booking)).toBe(SOURCE)
    expect(await mailsAfterSettling({ to: booking.email, subjectIncludes: 'déplacée' })).toEqual([])

    const forced = await reschedule(booking.id, { date: CLOSED_DAY, force: true })
    expect(forced.status).toBe(200)
    expect((forced.body as unknown as ProRescheduleResponse).overriddenCodes).toEqual(['dayClosed'])
    expect(await dateOf(booking)).toBe(CLOSED_DAY)
    await waitForOneMail({ to: booking.email, subjectIncludes: 'déplacée' })
  })

  it('refuses a full day with dayFull, then moves it with force', async () => {
    const booking = await seedPaid('full', SOURCE)
    const refused = await reschedule(booking.id, { date: FULL_DAY })
    expect(refused.status).toBe(409)
    expect(refused.body.data?.code).toBe('dayFull')
    expect(await dateOf(booking)).toBe(SOURCE)

    const forced = await reschedule(booking.id, { date: FULL_DAY, force: true })
    expect(forced.status).toBe(200)
    expect((forced.body as unknown as ProRescheduleResponse).overriddenCodes).toEqual(['dayFull'])
    expect(await dateOf(booking)).toBe(FULL_DAY)
  })

  it('refuses a day imposed on a far commune with outOfSector, then moves it with force', async () => {
    const booking = await seedPaid('sector', SOURCE)
    const refused = await reschedule(booking.id, { date: LYON_DAY })
    expect(refused.status).toBe(409)
    expect(refused.body.data?.code).toBe('outOfSector')
    expect(await dateOf(booking)).toBe(SOURCE)

    const forced = await reschedule(booking.id, { date: LYON_DAY, force: true })
    expect(forced.status).toBe(200)
    expect((forced.body as unknown as ProRescheduleResponse).overriddenCodes).toEqual([
      'outOfSector',
    ])
  })

  it('refuses an address out of the service area with outOfArea, then moves it with force', async () => {
    const booking = await seedPaid('area', SOURCE, { address: PARIS_ADDRESS })
    const refused = await reschedule(booking.id, { date: PARIS_DAY })
    expect(refused.status).toBe(409)
    expect(refused.body.data?.code).toBe('outOfArea')
    expect(await dateOf(booking)).toBe(SOURCE)

    const forced = await reschedule(booking.id, { date: PARIS_DAY, force: true })
    expect(forced.status).toBe(200)
    expect((forced.body as unknown as ProRescheduleResponse).overriddenCodes).toEqual(['outOfArea'])
  })

  it('reports every overridden check when several fail at once', async () => {
    const booking = await seedPaid('multi', SOURCE, { address: PARIS_ADDRESS })
    const refused = await reschedule(booking.id, { date: CLOSED_DAY })
    expect(refused.body.data?.code).toBe('outOfArea')
    const forced = await reschedule(booking.id, { date: CLOSED_DAY, force: true })
    expect(forced.status).toBe(200)
    expect((forced.body as unknown as ProRescheduleResponse).overriddenCodes).toEqual([
      'outOfArea',
      'dayClosed',
    ])
  })
})

describe('a move that is never allowed, force or not', () => {
  it.each([false, true])('refuses a past date with pastDate (force %s)', async force => {
    const booking = await seedPaid(`past-${force}`, SOURCE)
    const result = await reschedule(booking.id, { date: parisDateFromToday(-1), force })
    expect(result.status).toBe(422)
    expect(result.body.data?.code).toBe('pastDate')
    expect(await dateOf(booking)).toBe(SOURCE)
  })

  it('refuses the current date with sameDate', async () => {
    const booking = await seedPaid('same', SOURCE)
    const result = await reschedule(booking.id, { date: SOURCE, force: true })
    expect(result.status).toBe(422)
    expect(result.body.data?.code).toBe('sameDate')
  })

  it.each(['pending_payment', 'cancelled', 'completed'] as const)(
    'refuses a %s booking with notPaid',
    async status => {
      const booking = await seedPaid(`status-${status}`, SOURCE, { status })
      const result = await reschedule(booking.id, { date: OPEN_DAY, force: true })
      expect(result.status).toBe(422)
      expect(result.body.data?.code).toBe('notPaid')
      expect(await dateOf(booking)).toBe(SOURCE)
    },
  )

  it('answers 404 notFound to an unknown booking and to a malformed identifier', async () => {
    const unknown = await reschedule(crypto.randomUUID(), { date: OPEN_DAY })
    expect(unknown.status).toBe(404)
    expect(unknown.body.data?.code).toBe('notFound')
    const malformed = await reschedule('not-a-uuid', { date: OPEN_DAY })
    expect(malformed.status).toBe(404)
    expect(malformed.body.data?.code).toBe('notFound')
  })

  it('refuses a date beyond the horizon with tooFar, even with force', async () => {
    const booking = await seedPaid('far', SOURCE)
    const date = addDaysToIsoDate(parisDateFromToday(0), PRO_AVAILABILITY_HORIZON_DAYS + 1)
    const result = await reschedule(booking.id, { date, force: true })
    expect(result.status).toBe(400)
    expect(result.body.data?.code).toBe('tooFar')
    expect(await dateOf(booking)).toBe(SOURCE)
  })

  it('accepts the last day of the horizon with force', async () => {
    const booking = await seedPaid('horizon', SOURCE)
    const date = addDaysToIsoDate(parisDateFromToday(0), PRO_AVAILABILITY_HORIZON_DAYS)
    const result = await reschedule(booking.id, { date, force: true })
    expect(result.status).toBe(200)
    expect(await dateOf(booking)).toBe(date)
  })

  it.each([
    ['no body', undefined],
    ['no date', { force: true }],
    ['an impossible date', { date: '2026-02-30' }],
    ['a date in the wrong format', { date: '01/12/2026' }],
    ['a numeric date', { date: 20261201 }],
  ])('answers 400 invalidDate to %s', async (_name, body) => {
    const booking = await seedPaid('invalid', SOURCE)
    const result = await reschedule(booking.id, body)
    expect(result.status).toBe(400)
    expect(result.body.data?.code).toBe('invalidDate')
    expect(await dateOf(booking)).toBe(SOURCE)
  })

  it.each(['true', 1, null])('answers 400 to a force of %j', async force => {
    const booking = await seedPaid('force-type', SOURCE)
    const result = await reschedule(booking.id, { date: OPEN_DAY, force })
    expect(result.status).toBe(400)
    expect(await dateOf(booking)).toBe(SOURCE)
  })
})

describe('the move throttle', () => {
  it('refuses the 4th move of one booking within the hour with tooFrequent, even with force', async () => {
    const booking = await seedPaid('throttle', LOOP_START_DAY)
    const targets = [LOOP_DAY, LOOP_START_DAY, LOOP_DAY]
    for (const date of targets) {
      const result = await reschedule(booking.id, { date })
      expect(result.status).toBe(200)
    }
    expect(await dateOf(booking)).toBe(LOOP_DAY)

    const refused = await reschedule(booking.id, { date: LOOP_START_DAY, force: true })
    expect(refused.status).toBe(429)
    expect(refused.body.data?.code).toBe('tooFrequent')
    expect(await dateOf(booking)).toBe(LOOP_DAY)
  })

  it('counts moves per booking, so another booking can still be moved', async () => {
    const other = await seedPaid('throttle-other', SOURCE)
    const result = await reschedule(other.id, { date: OPEN_DAY })
    expect(result.status).toBe(200)
  })
})
