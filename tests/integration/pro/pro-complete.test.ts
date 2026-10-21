import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createCustomer,
  openSession,
  seedAccountBooking,
  seedPhoto,
  sessionCookie,
} from '../../support/account'
import { createAdmin, removeE2eAdmins } from '../../support/admin'
import { sendApi, type ApiResult } from '../../support/api'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { uniqueTestEmail } from '../../support/env'
import { listMails, mailsAfterSettling, waitForMails } from '../../support/outbox'
import { readBookingProgress } from '../../support/pro'
import { parisDateFromToday } from '../../support/seed'

const COMPLETED_SUBJECT = 'Votre intervention est terminée'

const PHOTOS_SUBJECT = 'Vos photos avant/après sont disponibles'

let adminCookie: string

type Seeded = { id: string; email: string }

const seedPaidToday = async (tag: string): Promise<Seeded> => {
  const customer = await createCustomer({
    email: uniqueTestEmail(`complete-${tag}`),
    firstName: 'Termine',
  })
  const id = await seedAccountBooking({
    customerId: customer.id,
    status: 'paid',
    scheduledDate: parisDateFromToday(0),
  })
  return { id, email: customer.email }
}

const complete = (bookingId: string, force: boolean): Promise<ApiResult> =>
  sendApi('POST', `/api/pro/bookings/${bookingId}/complete`, {
    cookie: adminCookie,
    body: { force },
  })

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  const admin = await createAdmin(uniqueTestEmail('complete-admin'))
  adminCookie = sessionCookie((await openSession(admin.email)).raw)
})

afterAll(async () => {
  await cleanupE2eData()
  await removeE2eAdmins()
})

describe('POST /api/pro/bookings/[id]/complete mails', () => {
  it('refuses a completion without photos when not forced and sends no mail', async () => {
    const booking = await seedPaidToday('refused')
    const result = await complete(booking.id, false)
    expect(result.status).toBe(409)
    expect(result.body).toMatchObject({ data: { code: 'missingPhotos' } })
    expect(await mailsAfterSettling({ to: booking.email })).toHaveLength(0)
  })

  it('sends exactly one « intervention terminée » mail when forced without photos', async () => {
    const booking = await seedPaidToday('nophotos')
    const result = await complete(booking.id, true)
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ withoutPhotos: true, customerNotified: false })
    const mails = await waitForMails({ to: booking.email, subjectIncludes: COMPLETED_SUBJECT })
    expect(mails).toHaveLength(1)
    const all = await mailsAfterSettling({ to: booking.email })
    expect(all.filter(mail => mail.subject.includes(PHOTOS_SUBJECT))).toHaveLength(0)
    expect((await readBookingProgress(booking.id)).status).toBe('completed')
  })

  it('answers 409 alreadyCompleted on a second call and sends no further mail', async () => {
    const booking = await seedPaidToday('twice')
    await complete(booking.id, true)
    await waitForMails({ to: booking.email, subjectIncludes: COMPLETED_SUBJECT })
    const second = await complete(booking.id, true)
    expect(second.status).toBe(409)
    expect(second.body).toMatchObject({ data: { code: 'alreadyCompleted' } })
    const mails = (await mailsAfterSettling({ to: booking.email })).filter(mail =>
      mail.subject.includes(COMPLETED_SUBJECT),
    )
    expect(mails).toHaveLength(1)
  })

  it('sends only the photos mail when both photos are there', async () => {
    const booking = await seedPaidToday('photos')
    await seedPhoto({ bookingId: booking.id, kind: 'before' })
    await seedPhoto({ bookingId: booking.id, kind: 'after' })
    const result = await complete(booking.id, false)
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ withoutPhotos: false, customerNotified: true })
    const photosMails = await waitForMails({ to: booking.email, subjectIncludes: PHOTOS_SUBJECT })
    expect(photosMails).toHaveLength(1)
    const mails = (await listMails()).filter(mail => mail.to === booking.email)
    expect(mails.filter(mail => mail.subject.includes(COMPLETED_SUBJECT))).toHaveLength(0)
  })
})
