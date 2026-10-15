import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { assertTestStripeKey, cleanupE2eData } from '../support/db'
import { waitForSentEmails } from '../support/resend'
import { BASE_URL } from './support/api'
import {
  listForeignDueBookings,
  parisDateFromToday,
  readReminderState,
  seedBooking,
  type SeededBooking,
} from './support/seed'

type TaskResult = { result: { sent: number; failed: number } }

const runReminderTask = async (): Promise<TaskResult['result']> => {
  const response: Response = await fetch(`${BASE_URL}/_nitro/tasks/booking:reminders`)
  expect(response.status).toBe(200)
  return ((await response.json()) as TaskResult).result
}

const uniqueEmail = (tag: string): string =>
  `delivered+e2e-reminder-${tag}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@resend.dev`

let dayPlusOne: SeededBooking
let dayPlusTwo: SeededBooking
let dayPlusThree: SeededBooking
let today: SeededBooking
let pending: SeededBooking
let cancelled: SeededBooking
let alreadyReminded: SeededBooking
let firstRun: TaskResult['result']

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  const foreign = await listForeignDueBookings({
    from: parisDateFromToday(1),
    to: parisDateFromToday(2),
  })
  if (foreign.length > 0) {
    throw new Error('Real paid bookings are due in the reminder window: run this test another day')
  }
  dayPlusOne = await seedBooking({
    email: uniqueEmail('j1'),
    scheduledDate: parisDateFromToday(1),
    status: 'paid',
  })
  dayPlusTwo = await seedBooking({
    email: uniqueEmail('j2'),
    scheduledDate: parisDateFromToday(2),
    status: 'paid',
  })
  dayPlusThree = await seedBooking({
    email: uniqueEmail('j3'),
    scheduledDate: parisDateFromToday(3),
    status: 'paid',
  })
  today = await seedBooking({
    email: uniqueEmail('j0'),
    scheduledDate: parisDateFromToday(0),
    status: 'paid',
  })
  pending = await seedBooking({
    email: uniqueEmail('pending'),
    scheduledDate: parisDateFromToday(1),
    status: 'pending_payment',
  })
  cancelled = await seedBooking({
    email: uniqueEmail('cancelled'),
    scheduledDate: parisDateFromToday(2),
    status: 'cancelled',
  })
  alreadyReminded = await seedBooking({
    email: uniqueEmail('done'),
    scheduledDate: parisDateFromToday(1),
    status: 'paid',
    reminderSentAt: '2026-01-01T06:00:00.000Z',
  })
  firstRun = await runReminderTask()
})

afterAll(async () => {
  await cleanupE2eData()
})

describe('booking:reminders task', () => {
  it('reports two reminders sent and none failed on the first run', () => {
    expect(firstRun).toEqual({ sent: 2, failed: 0 })
  })

  it('records reminder_sent_at for a paid booking due tomorrow', async () => {
    expect((await readReminderState(dayPlusOne.id))?.reminder_sent_at).not.toBeNull()
  })

  it('records reminder_sent_at for a paid booking due in two days', async () => {
    expect((await readReminderState(dayPlusTwo.id))?.reminder_sent_at).not.toBeNull()
  })

  it('leaves a paid booking due in three days untouched', async () => {
    expect((await readReminderState(dayPlusThree.id))?.reminder_sent_at).toBeNull()
  })

  it('leaves a paid booking due today untouched', async () => {
    expect((await readReminderState(today.id))?.reminder_sent_at).toBeNull()
  })

  it('leaves a pending_payment booking untouched', async () => {
    expect((await readReminderState(pending.id))?.reminder_sent_at).toBeNull()
  })

  it('leaves a cancelled booking untouched', async () => {
    expect((await readReminderState(cancelled.id))?.reminder_sent_at).toBeNull()
  })

  it('keeps the original timestamp of an already reminded booking', async () => {
    expect((await readReminderState(alreadyReminded.id))?.reminder_sent_at).toMatch(
      /^2026-01-01T06:00:00/,
    )
  })

  it('sends nothing on a second run', async () => {
    expect(await runReminderTask()).toEqual({ sent: 0, failed: 0 })
  })

  it('had the reminder accepted by Resend with the French subject', async () => {
    const mails = await waitForSentEmails({
      to: dayPlusOne.email,
      subjectIncludes: 'Rappel : passage BINOVYA le',
    })
    expect(mails).toHaveLength(1)
  })

  it('sent no reminder to a booking outside the window', async () => {
    const mails = await waitForSentEmails({ to: dayPlusThree.email, subjectIncludes: '' }, 3000)
    expect(mails).toHaveLength(0)
  })
})
