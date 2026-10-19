import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { formatFullDate } from '../../../app/utils/date'
import {
  createCustomer,
  openSession,
  seedAccountBooking,
  sessionCookie,
} from '../../support/account'
import { THIONVILLE_ADDRESS } from '../../support/address'
import { createAdmin, removeE2eAdmins } from '../../support/admin'
import { sendApi, type ApiResult } from '../../support/api'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { adminMailbox, uniqueTestEmail } from '../../support/env'
import {
  findLink,
  htmlToText,
  normalizeSpaces,
  waitForMailCount,
  waitForOneMail,
} from '../../support/outbox'
import { FAR_RANGES, farDates, removeOverrides } from '../../support/pro'

import type { MailOutboxRecord } from '../../../app/types/email'

const [OLD_DATE, NEW_DATE] = farDates(FAR_RANGES.emailReschedule) as [string, string]

let customerEmail = ''
let bookingId = ''
let adminCookie = ''
let firstMail: MailOutboxRecord

const reschedule = (date: string): Promise<ApiResult> =>
  sendApi('POST', `/api/pro/bookings/${bookingId}/reschedule`, {
    cookie: adminCookie,
    body: { date },
  })

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  await removeOverrides([NEW_DATE, OLD_DATE])
  const admin = await createAdmin(uniqueTestEmail('mail-resched-admin'))
  adminCookie = sessionCookie((await openSession(admin.email)).raw)
  customerEmail = uniqueTestEmail('mail-resched')
  const customer = await createCustomer({ email: customerEmail, firstName: 'Deplace' })
  bookingId = await seedAccountBooking({
    customerId: customer.id,
    status: 'paid',
    scheduledDate: OLD_DATE,
  })
  for (const date of [NEW_DATE, OLD_DATE]) {
    await sendApi('PUT', `/api/pro/availability/overrides/${date}`, {
      cookie: adminCookie,
      body: { maxBookings: 5, note: null },
    })
  }
  expect((await reschedule(NEW_DATE)).status).toBe(200)
  firstMail = await waitForOneMail({ to: customerEmail, subjectIncludes: 'déplacée' })
})

afterAll(async () => {
  await removeOverrides([NEW_DATE, OLD_DATE])
  await cleanupE2eData()
  await removeE2eAdmins()
})

describe('booking reschedule mail', () => {
  it('goes to the customer with the new date in the subject and BINOVYA as reply-to', () => {
    expect(firstMail.to).toBe(customerEmail)
    expect(firstMail.subject).toBe(
      `Votre intervention BINOVYA a été déplacée au ${formatFullDate(NEW_DATE, 'fr-FR')}`,
    )
    expect(firstMail.replyTo).toBe(adminMailbox())
  })

  it('has an idempotency key of its own for each move, ending with the booking id', () => {
    expect(firstMail.idempotencyKey).toMatch(
      new RegExp(`^booking-reschedule-[0-9a-f-]{36}-${bookingId}$`),
    )
  })

  it('states the old date, the new date, the address and the bins', () => {
    const text = normalizeSpaces(htmlToText(firstMail.html))
    expect(text).toContain('Bonjour Deplace,')
    expect(text).toContain(formatFullDate(OLD_DATE, 'fr-FR'))
    expect(text).toContain(formatFullDate(NEW_DATE, 'fr-FR'))
    expect(text).toContain(THIONVILLE_ADDRESS.label)
    expect(text).toContain('Ancienne date')
    expect(text).toContain('Nouvelle date')
  })

  it('tells the customer to empty the bins the day before', () => {
    const text = normalizeSpaces(htmlToText(firstMail.html))
    expect(text).toContain('Videz vos bacs la veille')
    expect(text).toContain('rappel par mail')
  })

  it('links to the customer login page', () => {
    expect(findLink(firstMail.html, '/login')).toBeDefined()
  })

  it('sends a second mail, with a new key, when the booking is moved back', async () => {
    expect((await reschedule(OLD_DATE)).status).toBe(200)
    const mails: MailOutboxRecord[] = await waitForMailCount(
      { to: customerEmail, subjectIncludes: 'déplacée' },
      2,
    )
    expect(mails).toHaveLength(2)
    expect(new Set(mails.map(mail => mail.idempotencyKey)).size).toBe(2)
    expect(mails[1]?.subject).toContain(formatFullDate(OLD_DATE, 'fr-FR'))
  })
})
