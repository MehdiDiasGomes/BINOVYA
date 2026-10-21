import { beforeEach, describe, expect, it, vi } from 'vitest'

import { formatLongDate } from '../../../app/utils/date'
import enBooking from '../../../i18n/locales/en/booking'
import frBooking from '../../../i18n/locales/fr/booking'
import { attachBookingCheckout, bookingPageUrl } from '../../../server/utils/bookingCheckout'
import { localizedSiteUrl, resolveSiteUrl } from '../../../server/utils/siteUrl'
import { ensureStripeCustomer } from '../../../server/utils/stripeCustomer'
import { THIONVILLE_ADDRESS } from '../../support/address'
import { asClient, stubCreateError } from '../../support/pro-fixtures'

vi.mock('../../../server/utils/stripeCustomer', () => ({ ensureStripeCustomer: vi.fn() }))

const sessions = vi.hoisted(() => ({ create: vi.fn() }))

const SITE_URL = 'https://binovya.test'

const INPUT = {
  bookingId: '99999999-2222-3333-4444-555555555555',
  profileId: '11111111-2222-3333-4444-555555555555',
  amountCents: 1990,
  plan: 'one_off' as const,
  scheduledDate: '2026-11-12',
  address: THIONVILLE_ADDRESS,
}

const client = asClient({
  from: vi.fn(() => ({
    update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
  })),
})

const sentParams = (): Record<string, unknown> => sessions.create.mock.calls[0]![0]

beforeEach(() => {
  stubCreateError()
  vi.stubGlobal('useStripe', () => ({ checkout: { sessions } }))
  vi.stubGlobal('useRuntimeConfig', () => ({ siteUrl: SITE_URL }))
  vi.stubGlobal('resolveSiteUrl', resolveSiteUrl)
  vi.stubGlobal('localizedSiteUrl', localizedSiteUrl)
  vi.stubGlobal('isError', (error: unknown) => error instanceof Error)
  sessions.create.mockReset().mockResolvedValue({ id: 'cs_1', url: 'https://checkout.test/cs_1' })
  vi.mocked(ensureStripeCustomer)
    .mockReset()
    .mockResolvedValue({ customerId: 'cus_1', hasAddress: false })
})

describe('bookingPageUrl', () => {
  it('sends a French customer back to /booking without prefix', () => {
    expect(bookingPageUrl('fr', 'success')).toBe(`${SITE_URL}/booking?checkout=success`)
  })

  it('sends an English customer back to /en/booking after a payment', () => {
    expect(bookingPageUrl('en', 'success')).toBe(`${SITE_URL}/en/booking?checkout=success`)
  })

  it('sends an English customer back to /en/booking after a cancellation', () => {
    expect(bookingPageUrl('en', 'cancelled')).toBe(`${SITE_URL}/en/booking?checkout=cancelled`)
  })
})

describe('attachBookingCheckout in English', () => {
  it('opens the Stripe page in English and returns to the English booking page', async () => {
    await attachBookingCheckout(client, { ...INPUT, locale: 'en' })
    expect(sentParams()).toMatchObject({
      locale: 'en',
      success_url: `${SITE_URL}/en/booking?checkout=success`,
      cancel_url: `${SITE_URL}/en/booking?checkout=cancelled`,
    })
  })

  it('names the product with the English plan title', async () => {
    await attachBookingCheckout(client, { ...INPUT, locale: 'en' })
    const expected = enBooking.checkout.productName.replace('{plan}', enBooking.plans.one_off.title)
    expect(JSON.stringify(sentParams())).toContain(expected)
    expect(JSON.stringify(sentParams())).not.toContain(frBooking.plans.one_off.title)
  })

  it('writes the invoice description with an English long date', async () => {
    await attachBookingCheckout(client, { ...INPUT, locale: 'en' })
    expect(JSON.stringify(sentParams())).toContain(formatLongDate(INPUT.scheduledDate, 'en'))
  })

  it('keeps the French return pages and plan title for a French customer', async () => {
    await attachBookingCheckout(client, { ...INPUT, locale: 'fr' })
    expect(sentParams()).toMatchObject({
      locale: 'fr',
      success_url: `${SITE_URL}/booking?checkout=success`,
    })
    expect(JSON.stringify(sentParams())).toContain(frBooking.plans.one_off.title)
  })
})
