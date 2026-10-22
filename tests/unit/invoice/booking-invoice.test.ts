import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { INVOICE_LEGAL_FIELDS, INVOICE_LEGAL_MENTIONS } from '../../../app/constants/invoice'
import {
  bookingInvoiceCreation,
  issueRefundCreditNote,
  sessionInvoiceId,
  storeBookingInvoice,
} from '../../../server/utils/bookingInvoice'
import { FAILURE, OK, asClient, caught, stubCreateError } from '../../support/pro-fixtures'

import type Stripe from 'stripe'

type CustomField = Stripe.Checkout.SessionCreateParams.InvoiceCreation.InvoiceData.CustomField

const BOOKING_ID = '11111111-2222-3333-4444-555555555555'

const STRIPE_MAX_CUSTOM_FIELDS = 4

const STRIPE_MAX_FIELD_NAME = 40

const STRIPE_MAX_FIELD_VALUE = 140

const creditNotesCreate = vi.fn()

const mailer = vi.hoisted(() => ({ sendTransactionalEmail: vi.fn() }))

vi.mock('../../../server/utils/mail', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../server/utils/mail')>()),
  ...mailer,
}))

vi.mock('../../../server/utils/stripe', () => ({
  useStripe: () => ({ creditNotes: { create: creditNotesCreate } }),
}))

beforeEach(() => {
  creditNotesCreate.mockResolvedValue({ id: 'cn_test' })
  mailer.sendTransactionalEmail.mockReset().mockResolvedValue(true)
  vi.stubGlobal('useRuntimeConfig', () => ({ contactEmailTo: 'ops@binovya.test' }))
  stubCreateError()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  creditNotesCreate.mockReset()
})

describe('bookingInvoiceCreation', () => {
  const creation = bookingInvoiceCreation(BOOKING_ID, 'Nettoyage le 19 octobre')

  const customFieldsOf = (): CustomField[] => {
    const fields = creation.invoice_data?.custom_fields
    return Array.isArray(fields) ? fields : []
  }

  it('enables the invoice with the booking description and metadata', () => {
    expect(creation.enabled).toBe(true)
    expect(creation.invoice_data?.description).toBe('Nettoyage le 19 octobre')
    expect(creation.invoice_data?.metadata).toEqual({ booking_id: BOOKING_ID })
  })

  it('prints the legal footer', () => {
    expect(creation.invoice_data?.footer).toBe(INVOICE_LEGAL_MENTIONS.footer)
  })

  it('sends at most 4 custom fields, the Stripe limit', () => {
    const fields = customFieldsOf()
    expect(fields).toHaveLength(STRIPE_MAX_CUSTOM_FIELDS)
    expect(fields).toHaveLength(INVOICE_LEGAL_FIELDS.length)
  })

  it('keeps every custom field name and value within the Stripe limits', () => {
    const fields = customFieldsOf()
    fields.forEach(field => {
      expect(field.name.length).toBeGreaterThan(0)
      expect(field.name.length).toBeLessThanOrEqual(STRIPE_MAX_FIELD_NAME)
      expect(field.value.length).toBeGreaterThan(0)
      expect(field.value.length).toBeLessThanOrEqual(STRIPE_MAX_FIELD_VALUE)
    })
  })
})

describe('sessionInvoiceId', () => {
  const session = (invoice: unknown): Stripe.Checkout.Session =>
    ({ invoice }) as Stripe.Checkout.Session

  it('reads an invoice identifier', () => {
    expect(sessionInvoiceId(session('in_test'))).toBe('in_test')
  })

  it('reads the id of an expanded invoice', () => {
    expect(sessionInvoiceId(session({ id: 'in_expanded' }))).toBe('in_expanded')
  })

  it('returns null without invoice', () => {
    expect(sessionInvoiceId(session(null))).toBeNull()
  })
})

describe('storeBookingInvoice', () => {
  const clientWith = (result: { data: unknown; error: unknown }) => {
    const is = vi.fn().mockResolvedValue(result)
    const eq = vi.fn(() => ({ is }))
    const update = vi.fn(() => ({ eq }))
    return { client: asClient({ from: vi.fn(() => ({ update })) }), update, eq, is }
  }

  it('writes only an empty link, filtered on the booking', async () => {
    const { client, update, eq, is } = clientWith(OK)
    await storeBookingInvoice(client, BOOKING_ID, 'in_test')
    expect(update).toHaveBeenCalledWith({ stripe_invoice_id: 'in_test' })
    expect(eq).toHaveBeenCalledWith('id', BOOKING_ID)
    expect(is).toHaveBeenCalledWith('stripe_invoice_id', null)
  })

  it('writes nothing without invoice', async () => {
    const { client, update } = clientWith(OK)
    await storeBookingInvoice(client, BOOKING_ID, null)
    expect(update).not.toHaveBeenCalled()
  })

  it('throws 500 when the update fails, so Stripe retries', async () => {
    const { client } = clientWith(FAILURE)
    const error = await caught(() => storeBookingInvoice(client, BOOKING_ID, 'in_test'))
    expect(error.statusCode).toBe(500)
  })
})

describe('issueRefundCreditNote', () => {
  const creditNote = {
    bookingId: BOOKING_ID,
    invoiceId: 'in_test',
    refundId: 're_test',
    amountCents: 1990,
  }

  it('links the credit note to the refund with a per-booking idempotency key', async () => {
    await issueRefundCreditNote(creditNote)
    expect(creditNotesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice: 'in_test',
        amount: 1990,
        refunds: [{ refund: 're_test' }],
        metadata: { booking_id: BOOKING_ID },
      }),
      { idempotencyKey: `booking-credit-note-${BOOKING_ID}` },
    )
  })

  it('sends no alert when the credit note is issued', async () => {
    await issueRefundCreditNote(creditNote)
    expect(mailer.sendTransactionalEmail).not.toHaveBeenCalled()
  })

  it('never throws when Stripe fails, and alerts BINOVYA once with a per-booking key', async () => {
    creditNotesCreate.mockRejectedValue(new Error('stripe down'))
    await expect(issueRefundCreditNote(creditNote)).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(mailer.sendTransactionalEmail).toHaveBeenCalledTimes(1)
    expect(mailer.sendTransactionalEmail.mock.calls[0]?.[0]).toMatchObject({
      to: 'ops@binovya.test',
      idempotencyKey: `booking-credit-note-alert-${BOOKING_ID}`,
    })
  })

  it('does not alert nor throw when no admin address is configured', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ contactEmailTo: '' }))
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    creditNotesCreate.mockRejectedValue(new Error('stripe down'))
    await expect(issueRefundCreditNote(creditNote)).resolves.toBeUndefined()
    expect(mailer.sendTransactionalEmail).not.toHaveBeenCalled()
  })
})
