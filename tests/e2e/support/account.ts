import enAccount from '../../../i18n/locales/en/account'
import frAccount from '../../../i18n/locales/fr/account'
import {
  createCustomer,
  generateTokenHash,
  seedAccountBooking,
  seedPhoto,
  type AccountCustomer,
} from '../../support/account'
import { uniqueTestEmail } from '../../support/env'

export type Lang = 'fr' | 'en'

export const ACCOUNT_MESSAGES = { fr: frAccount, en: enAccount }

export type SeededArea = {
  customer: AccountCustomer
  paidId: string
  completedId: string
  cancelledId: string
}

/**
 * Creates a customer with a paid, a completed (with before and after photos) and a cancelled
 * booking, as the area shows them.
 * @param tag - Short label put in the email
 * @returns Customer and booking identifiers
 */
export const seedArea = async (tag: string): Promise<SeededArea> => {
  const customer: AccountCustomer = await createCustomer({
    email: uniqueTestEmail(tag),
    firstName: 'Ada',
  })
  const completedId: string = await seedAccountBooking({
    customerId: customer.id,
    status: 'completed',
    scheduledDate: '2026-09-01',
  })
  const paidId: string = await seedAccountBooking({
    customerId: customer.id,
    status: 'paid',
    scheduledDate: '2027-03-10',
  })
  const cancelledId: string = await seedAccountBooking({
    customerId: customer.id,
    status: 'cancelled',
    scheduledDate: '2026-12-01',
  })
  await seedPhoto({ bookingId: completedId, kind: 'before' })
  await seedPhoto({ bookingId: completedId, kind: 'after' })
  return { customer, paidId, completedId, cancelledId }
}

export const confirmPath = async (
  email: string,
  lang: Lang,
  options: { legacyType?: boolean } = {},
): Promise<string> => {
  const tokenHash: string = await generateTokenHash(email)
  const prefix: string = lang === 'fr' ? '' : '/en'
  return `${prefix}/account/confirm#token_hash=${tokenHash}${options.legacyType ? '&type=magiclink' : ''}`
}
