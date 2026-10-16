import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { generateBookingAdminEmail } from '../../../app/templates/email/bookingAdminEmail'
import {
  generateBookingConfirmationEmail,
  generateBookingRefundEmail,
  generateBookingReminderEmail,
} from '../../../app/templates/email/bookingCustomerEmails'
import { generateContactEmailHtml } from '../../../app/templates/email/contactEmail'
import { generatePhotosAvailableEmail } from '../../../app/templates/email/photosAvailableEmail'
import { generateQuoteEmailHtml } from '../../../app/templates/email/quoteEmail'
import { sendBookingRefundEmail } from '../../../server/utils/bookingEmails'
import { escapeHtml, sendTransactionalEmail } from '../../../server/utils/mail'

import type { BookingEmailData } from '../../../app/types/email'

const sendMock = vi.hoisted(() => vi.fn())

vi.mock('resend', () => ({
  Resend: class {
    public emails: { send: typeof sendMock } = { send: sendMock }
  },
}))

const HOSTILE_TEXT = '<script>alert(1)</script>'

const BOOKING: BookingEmailData = {
  id: '11111111-2222-3333-4444-555555555555',
  firstName: HOSTILE_TEXT,
  lastName: 'Lovelace',
  email: 'ada@example.test',
  phone: '+33612345678',
  scheduledDate: '2026-10-19',
  address: `${HOSTILE_TEXT} rue`,
  plan: 'one_off',
  smallBinCount: 1,
  largeBinCount: 1,
  amountTotalCents: 1990,
}

const CONTACT = {
  firstName: HOSTILE_TEXT,
  lastName: '<b>L</b>',
  company: '<i>Corp</i>',
  email: 'ada@example.test',
  phone: '+33612345678',
}

const QUOTE = {
  ...CONTACT,
  address: HOSTILE_TEXT,
  equipmentLabel: 'Bacs',
  binsLabel: '2 petits bacs',
  planLabel: 'Annuelle',
  comment: '<img src=x>',
  photoUrls: ['https://x.supabase.co/a?t=1&u=2', 'https://x.supabase.co/b"><i>'],
  photoLinkDays: 7,
}

const preheaderOf = (html: string): string =>
  /<div class="preheader">(.*?)(?:&#847;|<\/div>)/s.exec(html)?.[1] ?? ''

const renderers: [string, () => string][] = [
  ['confirmation', () => generateBookingConfirmationEmail(BOOKING, escapeHtml).html],
  ['reminder', () => generateBookingReminderEmail(BOOKING, escapeHtml).html],
  ['refund', () => generateBookingRefundEmail({ ...BOOKING, bookingUrl: '' }, escapeHtml).html],
  [
    'photos',
    () =>
      generatePhotosAvailableEmail(
        { ...BOOKING, loginUrl: 'https://binovya.fr/x', siteUrl: 'https://binovya.fr' },
        escapeHtml,
      ).html,
  ],
  ['admin alert', () => generateBookingAdminEmail(BOOKING, escapeHtml).html],
  [
    'contact',
    () =>
      generateContactEmailHtml(
        { ...CONTACT, subjectLabel: HOSTILE_TEXT, message: 'm' },
        escapeHtml,
      ),
  ],
  ['quote', () => generateQuoteEmailHtml(QUOTE, escapeHtml)],
]

describe.each(renderers)('%s preheader', (_name, render) => {
  const html: string = render()
  const preheader: string = preheaderOf(html)

  it('is present and not empty', () => {
    expect(preheader.length).toBeGreaterThan(10)
  })

  it('does not contain raw markup from untrusted fields', () => {
    expect(preheader).not.toContain('<')
    expect(html).not.toContain('<script')
  })
})

describe('generateContactEmailHtml', () => {
  const html: string = generateContactEmailHtml(
    { ...CONTACT, subjectLabel: 'Devis', message: 'Ligne 1\n<b>gras</b> {{x}}' },
    escapeHtml,
  )

  it('escapes every field', () => {
    ;['<script', '<b>', '<i>'].forEach(fragment => expect(html).not.toContain(fragment))
    expect(html).toContain('&lt;b&gt;gras&lt;/b&gt;')
  })

  it('shows the subject and the message', () => {
    expect(html).toContain('Devis')
    expect(html).toContain('Ligne 1')
  })

  it('uses the compact notification layout', () => {
    expect(html).toContain('header-compact')
  })
})

describe('generateQuoteEmailHtml', () => {
  const html: string = generateQuoteEmailHtml(QUOTE, escapeHtml)

  it('escapes every field', () => {
    ;['<script', '<b>', '<img', '<i>'].forEach(fragment => expect(html).not.toContain(fragment))
  })

  it('links each photo as « Photo n du devis » with an escaped URL', () => {
    expect(html).toContain('<a href="https://x.supabase.co/a?t=1&amp;u=2">Photo 1 du devis</a>')
    expect(html).toContain('Photo 2 du devis</a>')
    expect(html).toContain('Photos (liens valables 7 jours)')
  })

  it('omits the photo row without photos', () => {
    expect(generateQuoteEmailHtml({ ...QUOTE, photoUrls: [] }, escapeHtml)).not.toContain('Photo 1')
  })
})

describe('sendBookingRefundEmail button', () => {
  const customer = {
    id: 'c1',
    email: 'delivered@resend.dev',
    first_name: 'Ada',
    last_name: 'L',
    phone: '+33612345678',
  }
  const booking = {
    id: 'b1',
    customer_id: 'c1',
    scheduled_date: '2026-10-19',
    address: '1 rue X',
    plan: 'one_off',
    small_bin_count: 1,
    large_bin_count: 0,
    amount_total_cents: 1990,
  }

  const queryFor = (table: string): { maybeSingle: () => Promise<{ data: object }> } => ({
    maybeSingle: () => Promise.resolve({ data: table === 'bookings' ? booking : customer }),
  })

  const fakeClient = {
    from: (table: string) => ({ select: () => ({ eq: () => queryFor(table) }) }),
  }

  const sentHtml = async (siteUrl: string): Promise<string> => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      resendApiKey: 're_test',
      mailFrom: '',
      contactEmailTo: '',
      siteUrl,
    }))
    sendMock.mockResolvedValue({ error: null })
    await sendBookingRefundEmail(fakeClient as never, 'b1')
    return String(sendMock.mock.calls[0]?.[0].html)
  }

  beforeEach(() => {
    vi.stubGlobal('escapeHtml', escapeHtml)
    vi.stubGlobal('sendTransactionalEmail', sendTransactionalEmail)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    sendMock.mockReset()
  })

  it('has no button when the site URL is plain http on a public host', async () => {
    expect(await sentHtml(['http', '//binovya.fr'].join(':'))).not.toContain(
      'Réserver une autre date',
    )
  })

  it('has the button when the site URL is https', async () => {
    expect(await sentHtml('https://binovya.fr')).toContain('href="https://binovya.fr/booking"')
  })
})
