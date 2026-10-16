import { describe, expect, it } from 'vitest'

import {
  generateDeletionRequestAlert,
  generateLoginLinkEmail,
} from '../../../app/templates/email/accountEmails'
import { generateBookingConfirmationEmail } from '../../../app/templates/email/bookingCustomerEmails'
import { escapeHtml } from '../../../server/utils/mail'

import type { BookingEmailData } from '../../../app/types/email'

const LOGIN_URL = 'https://binovya.fr/account/confirm#token_hash=abc123&type=magiclink'

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

const DELETION = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.test',
  phone: '+33612345678',
  requestedAt: '2026-10-15T10:30:00.000Z',
}

const HOSTILE = {
  firstName: '<script>alert(1)</script>',
  lastName: `O"Brien'<img src=x onerror=alert(2)>`,
  email: `"><script>alert(3)</script>@example.test`,
  phone: `"><b>1</b>`,
  requestedAt: '2026-10-15T10:30:00.000Z',
}

const HOSTILE_FRAGMENTS: string[] = ['<script', '<img', '<b>']

describe('generateLoginLinkEmail', () => {
  const email = generateLoginLinkEmail({ firstName: 'Ada', loginUrl: LOGIN_URL }, escapeHtml)

  it('has the login subject', () => {
    expect(email.subject).toBe('Votre lien de connexion à votre espace BINOVYA')
  })

  it('greets the customer by first name', () => {
    expect(email.html).toContain('Bonjour Ada,')
  })

  it('has a "Me connecter" button pointing to the link, ampersand escaped', () => {
    expect(email.html).toMatch(
      /<a class="button" href="https:\/\/binovya\.fr\/account\/confirm#token_hash=abc123&amp;type=magiclink">Me connecter<\/a>/,
    )
  })

  it('mentions the 24 hours validity and the single use', () => {
    const text = email.html.replace(/\s+/g, ' ')
    expect(text).toContain('valable 24 heures et ne sert qu')
  })

  it('escapes a hostile first name', () => {
    const hostile = generateLoginLinkEmail(
      { firstName: HOSTILE.firstName, loginUrl: LOGIN_URL },
      escapeHtml,
    )
    HOSTILE_FRAGMENTS.forEach(fragment => expect(hostile.html).not.toContain(fragment))
    expect(hostile.html).toContain('&lt;script&gt;')
  })

  it('escapes a quote in the link so it cannot break out of the href', () => {
    const hostile = generateLoginLinkEmail(
      { firstName: 'Ada', loginUrl: 'https://binovya.fr/x" onclick="alert(1)' },
      escapeHtml,
    )
    expect(hostile.html).not.toContain('" onclick=')
  })
})

describe('generateDeletionRequestAlert', () => {
  const email = generateDeletionRequestAlert(DELETION, escapeHtml)

  it('names the customer in the subject', () => {
    expect(email.subject).toBe('Demande de suppression de compte - Lovelace Ada')
  })

  it('mentions the one month handling delay', () => {
    expect(email.html.replace(/\s+/g, ' ')).toContain('À traiter sous un mois (délai légal RGPD)')
  })

  it('shows the customer identity and the request date in Paris time', () => {
    expect(email.html).toContain('ada@example.test')
    expect(email.html).toContain('+33612345678')
    expect(email.html).toMatch(/Demande reçue le/)
    expect(email.html).toMatch(/15 octobre 2026/)
  })

  it('escapes hostile customer data', () => {
    const hostile = generateDeletionRequestAlert(
      { ...HOSTILE, firstName: HOSTILE.firstName },
      escapeHtml,
    )
    HOSTILE_FRAGMENTS.forEach(fragment => expect(hostile.html).not.toContain(fragment))
  })

  it('uses the Paris calendar day for a request just after midnight there', () => {
    const late = generateDeletionRequestAlert(
      { ...DELETION, requestedAt: '2026-10-15T22:30:00.000Z' },
      escapeHtml,
    )
    expect(late.html).toMatch(/16 octobre 2026/)
  })
})

describe('generateBookingConfirmationEmail tracking link', () => {
  it('contains the "Suivre ma réservation" link to the login page', () => {
    const email = generateBookingConfirmationEmail(
      { ...BOOKING, accountUrl: 'https://binovya.fr/login' },
      escapeHtml,
    )
    expect(email.html).toContain('<a href="https://binovya.fr/login">Suivre ma réservation</a>')
  })

  it('omits the link when no account URL is given', () => {
    const email = generateBookingConfirmationEmail(BOOKING, escapeHtml)
    expect(email.html).not.toContain('Suivre ma réservation')
  })

  it('omits the link when the account URL is an empty string', () => {
    const email = generateBookingConfirmationEmail({ ...BOOKING, accountUrl: '' }, escapeHtml)
    expect(email.html).not.toContain('Suivre ma réservation')
  })

  it('does not carry a token in the tracking link', () => {
    const email = generateBookingConfirmationEmail(
      { ...BOOKING, accountUrl: 'https://binovya.fr/login' },
      escapeHtml,
    )
    expect(email.html).not.toContain('token_hash')
  })
})
