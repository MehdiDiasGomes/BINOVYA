import { describe, expect, it } from 'vitest'

import { paymentDocumentView } from '../../../app/utils/accountPaymentDocument'

import type { AccountBookingDocuments } from '../../../app/types/account'

const RECEIPT_URL = 'https://pay.stripe.com/receipts/test'

const INVOICE_URL = 'https://invoice.stripe.com/i/test.pdf'

const documents = (patch: Partial<AccountBookingDocuments>): AccountBookingDocuments => ({
  photos: { before: null, after: null },
  receiptUrl: null,
  invoice: null,
  isPaidOffline: false,
  ...patch,
})

describe('paymentDocumentView', () => {
  it('offers the invoice PDF download when the invoice has a PDF', () => {
    const view = paymentDocumentView(
      documents({ invoice: { url: INVOICE_URL, isPdf: true }, receiptUrl: RECEIPT_URL }),
    )
    expect(view).toMatchObject({
      titleKey: 'account.detail.invoice.title',
      openKey: 'account.detail.invoice.download',
      newTabKey: 'account.detail.invoice.pdfNewTab',
      icon: 'FileText',
      url: INVOICE_URL,
    })
  })

  it('opens the hosted invoice page when there is no PDF', () => {
    const view = paymentDocumentView(documents({ invoice: { url: INVOICE_URL, isPdf: false } }))
    expect(view).toMatchObject({
      openKey: 'account.detail.invoice.open',
      newTabKey: 'account.detail.newTab',
      url: INVOICE_URL,
    })
  })

  it('keeps the invoice view with a null URL when its link is unavailable', () => {
    const view = paymentDocumentView(
      documents({ invoice: { url: null, isPdf: false }, receiptUrl: RECEIPT_URL }),
    )
    expect(view.titleKey).toBe('account.detail.invoice.title')
    expect(view.url).toBeNull()
    expect(view.unavailableKey).toBe('account.detail.invoice.unavailable')
  })

  it('falls back to the receipt without invoice', () => {
    const view = paymentDocumentView(documents({ receiptUrl: RECEIPT_URL }))
    expect(view).toMatchObject({
      titleKey: 'account.detail.receipt.title',
      icon: 'Receipt',
      url: RECEIPT_URL,
    })
  })

  it('has no URL without invoice nor receipt', () => {
    const view = paymentDocumentView(documents({}))
    expect(view.titleKey).toBe('account.detail.receipt.title')
    expect(view.url).toBeNull()
  })

  it('only states the offline payment for a booking paid outside the site', () => {
    const view = paymentDocumentView(
      documents({
        isPaidOffline: true,
        receiptUrl: RECEIPT_URL,
        invoice: { url: INVOICE_URL, isPdf: true },
      }),
    )
    expect(view).toMatchObject({
      titleKey: 'account.detail.offline.title',
      icon: 'HandCoins',
      url: null,
    })
  })
})
