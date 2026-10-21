import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  PAYMENT_RECEIPT_CACHE_TTL_MS,
  PAYMENT_RECEIPT_MISS_CACHE_TTL_MS,
} from '../../../app/constants/account'
import { loadAccountBookingDocuments } from '../../../server/utils/accountDocuments'

import type { AccountBookingRecord } from '../../../app/types/account'
import type { Database } from '../../../app/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

const PDF_URL = 'https://pay.stripe.com/invoice/acct_test/test_abc/pdf'

const HOSTED_URL = 'https://invoice.stripe.com/i/acct_test/test_abc'

const client = {} as SupabaseClient<Database>

const invoicesRetrieve = vi.fn()

const paymentIntentsRetrieve = vi.fn()

const newRecord = (patch: Partial<AccountBookingRecord> = {}): AccountBookingRecord => ({
  booking: { id: crypto.randomUUID(), status: 'paid' } as AccountBookingRecord['booking'],
  paymentIntentId: 'pi_test',
  invoiceId: 'in_test',
  isPaidOffline: false,
  ...patch,
})

beforeEach(() => {
  vi.useFakeTimers()
  invoicesRetrieve.mockReset()
  paymentIntentsRetrieve.mockReset()
  vi.stubGlobal('useStripe', () => ({
    invoices: { retrieve: invoicesRetrieve },
    paymentIntents: { retrieve: paymentIntentsRetrieve },
  }))
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const INSECURE_SCHEME = 'http'

const SCRIPT_SCHEME = 'javascript'

describe('invoice of loadAccountBookingDocuments', () => {
  it('returns the invoice PDF and no receipt for an invoiced booking', async () => {
    invoicesRetrieve.mockResolvedValue({ invoice_pdf: PDF_URL, hosted_invoice_url: HOSTED_URL })
    const documents = await loadAccountBookingDocuments(client, newRecord())
    expect(documents.invoice).toEqual({ url: PDF_URL, isPdf: true })
    expect(documents.receiptUrl).toBeNull()
    expect(paymentIntentsRetrieve).not.toHaveBeenCalled()
  })

  it('falls back to the hosted invoice page without PDF', async () => {
    invoicesRetrieve.mockResolvedValue({ invoice_pdf: null, hosted_invoice_url: HOSTED_URL })
    expect((await loadAccountBookingDocuments(client, newRecord())).invoice).toEqual({
      url: HOSTED_URL,
      isPdf: false,
    })
  })

  it('falls back to the hosted page when the PDF is outside stripe.com', async () => {
    invoicesRetrieve.mockResolvedValue({
      invoice_pdf: 'https://evil.example.com/invoice.pdf',
      hosted_invoice_url: HOSTED_URL,
    })
    expect((await loadAccountBookingDocuments(client, newRecord())).invoice?.url).toBe(HOSTED_URL)
  })

  it.each([
    `${INSECURE_SCHEME}://pay.stripe.com/invoice/pdf`,
    'https://stripe.com.evil.example/invoice',
    `${SCRIPT_SCHEME}:alert(1)`,
    'not a url',
  ])('refuses the invoice URL %s', async url => {
    invoicesRetrieve.mockResolvedValue({ invoice_pdf: url, hosted_invoice_url: url })
    expect((await loadAccountBookingDocuments(client, newRecord())).invoice).toEqual({
      url: null,
      isPdf: false,
    })
  })

  it('leaves the URL empty when Stripe fails, without throwing', async () => {
    invoicesRetrieve.mockRejectedValue(new Error('down'))
    expect((await loadAccountBookingDocuments(client, newRecord())).invoice).toEqual({
      url: null,
      isPdf: false,
    })
  })

  it('reads Stripe once for an invoice shown twice, for 5 minutes', async () => {
    invoicesRetrieve.mockResolvedValue({ invoice_pdf: PDF_URL })
    const record = newRecord()
    await loadAccountBookingDocuments(client, record)
    vi.advanceTimersByTime(PAYMENT_RECEIPT_CACHE_TTL_MS - 1)
    await loadAccountBookingDocuments(client, record)
    expect(invoicesRetrieve).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    await loadAccountBookingDocuments(client, record)
    expect(invoicesRetrieve).toHaveBeenCalledTimes(2)
  })

  it('keeps a missing invoice for 30 seconds only', async () => {
    invoicesRetrieve.mockResolvedValue({ invoice_pdf: null, hosted_invoice_url: null })
    const record = newRecord()
    await loadAccountBookingDocuments(client, record)
    vi.advanceTimersByTime(PAYMENT_RECEIPT_MISS_CACHE_TTL_MS - 1)
    await loadAccountBookingDocuments(client, record)
    expect(invoicesRetrieve).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    await loadAccountBookingDocuments(client, record)
    expect(invoicesRetrieve).toHaveBeenCalledTimes(2)
  })

  it('keeps the receipt for a booking without invoice', async () => {
    paymentIntentsRetrieve.mockResolvedValue({
      latest_charge: { receipt_url: 'https://pay.stripe.com/receipts/payment/abc' },
    })
    const documents = await loadAccountBookingDocuments(client, newRecord({ invoiceId: null }))
    expect(documents.invoice).toBeNull()
    expect(documents.receiptUrl).toBe('https://pay.stripe.com/receipts/payment/abc')
    expect(invoicesRetrieve).not.toHaveBeenCalled()
  })

  it('never calls Stripe for a booking paid offline', async () => {
    const documents = await loadAccountBookingDocuments(
      client,
      newRecord({ isPaidOffline: true, invoiceId: 'in_test', paymentIntentId: 'pi_test' }),
    )
    expect(documents).toEqual({
      photos: { before: null, after: null },
      receiptUrl: null,
      invoice: null,
      isPaidOffline: true,
    })
    expect(invoicesRetrieve).not.toHaveBeenCalled()
    expect(paymentIntentsRetrieve).not.toHaveBeenCalled()
  })
})
