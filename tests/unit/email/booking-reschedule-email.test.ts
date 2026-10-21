import { describe, expect, it } from 'vitest'

import { generateBookingRescheduleEmail } from '../../../app/templates/email/bookingCustomerEmails'
import { escapeHtml } from '../../../server/utils/mail'
import { THIONVILLE_ADDRESS } from '../../support/address'

import type { BookingEmailData } from '../../../app/types/email'

const BOOKING: BookingEmailData & { previousDate: string; accountUrl?: string } = {
  id: '11111111-2222-3333-4444-555555555555',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.test',
  phone: '+33612345678',
  scheduledDate: '2026-10-26',
  previousDate: '2026-10-19',
  address: THIONVILLE_ADDRESS.label,
  plan: 'one_off',
  smallBinCount: 1,
  largeBinCount: 1,
  amountTotalCents: 1990,
  accountUrl: 'https://binovya.fr/login',
}

const normalize = (text: string): string => text.replace(/\s/g, ' ')

describe('generateBookingRescheduleEmail', () => {
  const { subject, html } = generateBookingRescheduleEmail(BOOKING, escapeHtml)

  it('puts the new French date in the subject', () => {
    expect(subject).toBe('Votre intervention BINOVYA a été déplacée au lundi 26 octobre 2026')
  })

  it('greets the customer and states the old and the new date', () => {
    const text = normalize(html)
    expect(text).toContain('Bonjour Ada,')
    expect(text).toContain('Ancienne date')
    expect(text).toContain('lundi 19 octobre 2026')
    expect(text).toContain('Nouvelle date')
    expect(text).toContain('lundi 26 octobre 2026')
  })

  it('repeats the address and the bins', () => {
    const text = normalize(html)
    expect(text).toContain(THIONVILLE_ADDRESS.label)
    expect(text).toContain('Bacs')
  })

  it('reminds the customer to empty the bins and announces the next reminder', () => {
    expect(html).toContain('Videz vos bacs la veille')
    expect(html).toContain('rappel par mail')
  })

  it('links to the login page when an account URL is given', () => {
    expect(html).toContain('https://binovya.fr/login')
  })

  it('omits the tracking link without an account URL', () => {
    const { html: withoutLink } = generateBookingRescheduleEmail(
      { ...BOOKING, accountUrl: undefined },
      escapeHtml,
    )
    expect(withoutLink).not.toContain('https://binovya.fr/login')
  })

  it('does not let a name, an address or a date inject markup', () => {
    const { html: hostile } = generateBookingRescheduleEmail(
      {
        ...BOOKING,
        firstName: '<script>alert(1)</script>',
        address: '<img src=x onerror=alert(1)>',
        accountUrl: undefined,
      },
      escapeHtml,
    )
    expect(hostile).not.toContain('<script')
    expect(hostile).not.toContain('<img')
  })
})
