import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { formatFullDate } from '../../../app/utils/date'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { BASE_URL, adminMailbox, uniqueTestEmail } from '../../support/env'
import { htmlToText, normalizeSpaces, waitForOneMail } from '../../support/outbox'
import {
  listForeignDueBookings,
  parisDateFromToday,
  seedBooking,
  type SeededBooking,
} from '../../support/seed'

import type { MailOutboxRecord } from '../../../app/types/email'

let booking: SeededBooking
let reminder: MailOutboxRecord
let date = ''

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
  date = parisDateFromToday(1)
  booking = await seedBooking({
    email: uniqueTestEmail('mail-reminder'),
    scheduledDate: date,
    status: 'paid',
  })
  const response = await fetch(`${BASE_URL}/_nitro/tasks/booking:reminders`)
  expect(response.status).toBe(200)
  reminder = await waitForOneMail({ to: booking.email, subjectIncludes: 'Rappel' })
})

afterAll(async () => {
  await cleanupE2eData()
})

describe('booking reminder mail', () => {
  it('goes to the customer with the date in the subject and BINOVYA as reply-to', () => {
    expect(reminder.to).toBe(booking.email)
    expect(reminder.subject).toBe(`Rappel : passage BINOVYA le ${formatFullDate(date, 'fr-FR')}`)
    expect(reminder.replyTo).toBe(adminMailbox())
    expect(reminder.idempotencyKey).toBe(`booking-reminder-${booking.id}`)
  })

  it('tells the customer to empty the bins and gives the address and bins', () => {
    const text = normalizeSpaces(htmlToText(reminder.html))
    expect(text).toContain('Pensez à vider vos bacs')
    expect(text).toContain('12 rue de la Gare, 57100 Thionville')
    expect(text).toContain('Bonjour Rappel,')
  })
})
