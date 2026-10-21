import { describe, expect, it } from 'vitest'

import {
  generatePaymentLinkEmail,
  type PaymentLinkEmailData,
} from '../../../app/templates/email/paymentLinkEmail'
import { escapeHtml } from '../../../server/utils/mail'
import { THIONVILLE_ADDRESS } from '../../support/address'

const PAYMENT_URL = 'https://checkout.stripe.com/c/pay/cs_test_abc#fragment'

const DATA: PaymentLinkEmailData = {
  id: '11111111-2222-3333-4444-555555555555',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.test',
  phone: '+33612345678',
  scheduledDate: '2026-10-26',
  address: THIONVILLE_ADDRESS.label,
  plan: 'one_off',
  smallBinCount: 1,
  largeBinCount: 1,
  amountTotalCents: 1990,
  paymentUrl: PAYMENT_URL,
  paymentDueAt: '2026-10-21T08:30:00Z',
}

const normalize = (text: string): string => text.replace(/\s/g, ' ')

describe('generatePaymentLinkEmail', () => {
  const { subject, html } = generatePaymentLinkEmail(DATA, escapeHtml)
  const text = normalize(html)

  it('asks to finalise the payment in the subject', () => {
    expect(subject).toBe('Votre intervention BINOVYA : finalisez le paiement')
  })

  it('greets the customer and states the intervention date', () => {
    expect(text).toContain('Bonjour Ada,')
    expect(text).toContain('lundi 26 octobre 2026')
  })

  it('shows the amount to pay in euros', () => {
    expect(text).toContain('Montant à régler')
    expect(text).toContain('19,90')
  })

  it('states the payment deadline in Paris time', () => {
    expect(text).toContain('mercredi 21 octobre')
    expect(text).toContain('10:30')
  })

  it('repeats the address and the bins', () => {
    expect(text).toContain(THIONVILLE_ADDRESS.label)
    expect(text).toContain('Bacs')
  })

  it('links the pay button to the Checkout URL, escaped', () => {
    expect(html).toContain(`href="${escapeHtml(PAYMENT_URL)}"`)
    expect(text).toContain('Payer mon intervention')
  })

  it('warns that the slot is released without payment', () => {
    expect(text).toContain('le créneau est libéré')
  })

  it('escapes the first name and the address', () => {
    const { html: hostile } = generatePaymentLinkEmail(
      { ...DATA, firstName: '<script>x</script>', address: '"><img src=x onerror=1>' },
      escapeHtml,
    )
    expect(hostile).not.toContain('<script>')
    expect(hostile).not.toContain('<img src=x')
    expect(hostile).toContain('&lt;script&gt;')
  })

  it('escapes a hostile payment URL out of the attribute', () => {
    const { html: hostile } = generatePaymentLinkEmail(
      { ...DATA, paymentUrl: 'https://x.test/"><b>' },
      escapeHtml,
    )
    expect(hostile).not.toContain('"><b>')
  })
})
