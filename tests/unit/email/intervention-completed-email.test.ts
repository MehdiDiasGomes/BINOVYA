import { describe, expect, it } from 'vitest'

import { generateInterventionCompletedEmail } from '../../../app/templates/email/interventionCompletedEmail'
import { escapeHtml } from '../../../server/utils/mail'
import { THIONVILLE_ADDRESS } from '../../support/address'

import type { CustomerAreaEmailData } from '../../../app/templates/email/photosAvailableEmail'

const DATA: CustomerAreaEmailData = {
  id: '11111111-2222-3333-4444-555555555555',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.test',
  phone: '+33612345678',
  scheduledDate: '2026-10-26',
  address: THIONVILLE_ADDRESS.label,
  plan: 'one_off',
  smallBinCount: 1,
  largeBinCount: 0,
  amountTotalCents: 1990,
  accountUrl: 'https://binovya.fr/login',
  siteUrl: 'https://binovya.fr',
}

const normalize = (text: string): string => text.replace(/\s/g, ' ')

describe('generateInterventionCompletedEmail', () => {
  const { subject, html } = generateInterventionCompletedEmail(DATA, escapeHtml)
  const text = normalize(html)

  it('announces the finished intervention in the subject', () => {
    expect(subject).toBe('Votre intervention est terminée')
  })

  it('greets the customer and states date, address and bins', () => {
    expect(text).toContain('Bonjour Ada,')
    expect(text).toContain('lundi 26 octobre 2026')
    expect(text).toContain(THIONVILLE_ADDRESS.label)
    expect(text).toContain('Bacs')
  })

  it('never mentions photos', () => {
    expect(text.toLowerCase()).not.toContain('photo')
  })

  it('links to the login page of the customer area', () => {
    expect(html).toContain('href="https://binovya.fr/login"')
    expect(text).toContain('Voir ma réservation')
  })

  it('omits the button without account URL', () => {
    const { html: without } = generateInterventionCompletedEmail(
      { ...DATA, accountUrl: '' },
      escapeHtml,
    )
    expect(without).not.toContain('Voir ma réservation</a>')
  })

  it('escapes the first name and the address', () => {
    const { html: hostile } = generateInterventionCompletedEmail(
      { ...DATA, firstName: '<script>x</script>', address: '<b>rue</b>' },
      escapeHtml,
    )
    expect(hostile).not.toContain('<script>')
    expect(hostile).not.toContain('<b>rue</b>')
  })
})
