import { describe, expect, it } from 'vitest'

import { generateBookingAdminEmail } from '../../../app/templates/email/bookingAdminEmail'
import {
  generateBookingConfirmationEmail,
  generateBookingRefundEmail,
  generateBookingReminderEmail,
} from '../../../app/templates/email/bookingCustomerEmails'
import { generatePhotosAvailableEmail } from '../../../app/templates/email/photosAvailableEmail'
import { escapeHtml } from '../../../server/utils/mail'

import type { BookingEmailData } from '../../../app/types/email'

const normalize = (text: string): string => text.replace(/\s/g, ' ')

const BOOKING: BookingEmailData = {
  id: '11111111-2222-3333-4444-555555555555',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.test',
  phone: '+33612345678',
  scheduledDate: '2026-10-19',
  address: '12 rue de la Gare, 57100 Thionville',
  plan: 'one_off',
  smallBinCount: 1,
  largeBinCount: 1,
  amountTotalCents: 1990,
}

const HOSTILE: BookingEmailData = {
  ...BOOKING,
  firstName: '<script>alert(1)</script>',
  lastName: `O"Brien'<img src=x onerror=alert(2)>`,
  email: `"><script>alert(3)</script>@example.test`,
  phone: `"><b>1</b>`,
  address: `<script>alert(4)</script> rue "A" & 'B'`,
}

type Rendered = { subject: string; html: string }

const HOSTILE_FRAGMENTS: string[] = ['<script', '<img', '<b>']

const customerTemplates: [string, () => Rendered][] = [
  ['confirmation', () => generateBookingConfirmationEmail(HOSTILE, escapeHtml)],
  ['reminder', () => generateBookingReminderEmail(HOSTILE, escapeHtml)],
  [
    'refund',
    () =>
      generateBookingRefundEmail(
        { ...HOSTILE, bookingUrl: 'https://binovya.fr/booking' },
        escapeHtml,
      ),
  ],
  ['admin alert', () => generateBookingAdminEmail(HOSTILE, escapeHtml)],
  [
    'photos',
    () =>
      generatePhotosAvailableEmail(
        { ...HOSTILE, loginUrl: 'https://binovya.fr/x', siteUrl: 'https://binovya.fr' },
        escapeHtml,
      ),
  ],
]

describe.each(customerTemplates)('%s email escaping', (_name, render) => {
  it('does not let a name, address, email or phone inject markup', () => {
    const { html } = render()
    HOSTILE_FRAGMENTS.forEach(fragment => expect(html).not.toContain(fragment))
  })
})

describe('generateBookingConfirmationEmail', () => {
  const { subject, html } = generateBookingConfirmationEmail(BOOKING, escapeHtml)

  it('puts the French date in the subject', () => {
    expect(subject).toBe('Votre réservation BINOVYA du lundi 19 octobre 2026 est confirmée')
  })

  it('shows the amount formatted in French', () => {
    expect(normalize(html)).toContain('19,90 €')
  })

  it('shows date, address, bins and plan', () => {
    expect(html).toContain('lundi 19 octobre 2026')
    expect(html).toContain('12 rue de la Gare, 57100 Thionville')
    expect(html).toContain('1 petit bac + 1 grand bac')
    expect(html).toContain('Ponctuelle')
  })

  it('greets the customer by first name', () => {
    expect(html).toContain('Bonjour Ada,')
  })

  it('is a French document', () => {
    expect(html).toContain('<html lang="fr">')
  })
})

describe('generateBookingReminderEmail', () => {
  const { subject, html } = generateBookingReminderEmail(BOOKING, escapeHtml)

  it('puts the date in the subject', () => {
    expect(subject).toBe('Rappel : passage BINOVYA le lundi 19 octobre 2026')
  })

  it('reminds to empty the bins', () => {
    expect(html).toContain('vider vos bacs')
  })
})

describe('generateBookingRefundEmail', () => {
  it('shows the refunded amount formatted in French', () => {
    const { html } = generateBookingRefundEmail({ ...BOOKING, bookingUrl: '' }, escapeHtml)
    expect(normalize(html)).toContain('19,90 €')
  })

  it('has the rebook button when the site URL is known', () => {
    const { html } = generateBookingRefundEmail(
      { ...BOOKING, bookingUrl: 'https://binovya.fr/booking' },
      escapeHtml,
    )
    expect(html).toContain('<a class="button" href="https://binovya.fr/booking">')
    expect(html).toContain('Réserver une autre date')
  })

  it('has no button when the site URL is not set', () => {
    const { html } = generateBookingRefundEmail({ ...BOOKING, bookingUrl: '' }, escapeHtml)
    expect(html).not.toContain('class="button"')
    expect(html).not.toContain('Réserver une autre date')
  })

  it('escapes the booking URL', () => {
    const { html } = generateBookingRefundEmail(
      { ...BOOKING, bookingUrl: 'https://binovya.fr/booking?a="><script>' },
      escapeHtml,
    )
    expect(html).not.toContain('<script')
  })
})

describe('generateBookingAdminEmail', () => {
  const { subject, html } = generateBookingAdminEmail(BOOKING, escapeHtml)

  it('names the date and the customer in the subject', () => {
    expect(subject).toBe('Nouvelle réservation payée - lundi 19 octobre 2026 - Lovelace Ada')
  })

  it('shows contact, amount and booking reference', () => {
    expect(html).toContain('mailto:ada@example.test')
    expect(html).toContain('tel:+33612345678')
    expect(normalize(html)).toContain('19,90 €')
    expect(html).toContain(BOOKING.id)
  })
})

describe('generatePhotosAvailableEmail', () => {
  const data = {
    ...BOOKING,
    loginUrl: 'https://abc.supabase.co/auth/v1/verify?token=x&type=magiclink',
    siteUrl: 'https://binovya.fr',
  }

  it('has the one-click button pointing to the login URL', () => {
    const { html } = generatePhotosAvailableEmail(data, escapeHtml)
    expect(html).toContain('class="button"')
    expect(html).toContain('Voir mes photos')
    expect(html).toContain(
      'href="https://abc.supabase.co/auth/v1/verify?token=x&amp;type=magiclink"',
    )
  })

  it('lists the four fallback steps with the customer email and the site link', () => {
    const { html } = generatePhotosAvailableEmail(data, escapeHtml)
    expect(html.match(/<li>/g)).toHaveLength(4)
    expect(html).toContain('<a href="https://binovya.fr">https://binovya.fr</a>')
    expect(html).toContain('<strong>ada@example.test</strong>')
    expect(html).toContain('Espace client')
  })

  it('falls back to a generic site mention without site URL', () => {
    const { html } = generatePhotosAvailableEmail({ ...data, siteUrl: '' }, escapeHtml)
    expect(html).toContain('Rendez-vous sur notre site.')
  })

  it('has a fixed subject', () => {
    expect(generatePhotosAvailableEmail(data, escapeHtml).subject).toBe(
      'Vos photos avant/après sont disponibles',
    )
  })
})
