import type { AccountBookingDocuments, AccountPaymentDocumentView } from '@/types/account'

const RECEIPT_VIEW: Omit<AccountPaymentDocumentView, 'url'> = {
  titleKey: 'account.detail.receipt.title',
  openKey: 'account.detail.receipt.open',
  newTabKey: 'account.detail.newTab',
  unavailableKey: 'account.detail.receipt.unavailable',
  hintKey: 'account.detail.receipt.hint',
  icon: 'Receipt',
}

/**
 * Maps the payment document of a booking to what its page displays: the Stripe invoice when the
 * booking has one, as a PDF download or else its hosted page, otherwise the payment receipt.
 * @param documents - Documents of the booking, see `loadAccountBookingDocuments`
 * @returns Translation keys, icon and URL of the payment document, URL null when unavailable
 */
export const paymentDocumentView = (
  documents: AccountBookingDocuments,
): AccountPaymentDocumentView =>
  documents.invoice
    ? {
        titleKey: 'account.detail.invoice.title',
        openKey: documents.invoice.isPdf
          ? 'account.detail.invoice.download'
          : 'account.detail.invoice.open',
        newTabKey: documents.invoice.isPdf
          ? 'account.detail.invoice.pdfNewTab'
          : 'account.detail.newTab',
        unavailableKey: 'account.detail.invoice.unavailable',
        hintKey: 'account.detail.invoice.hint',
        icon: 'FileText',
        url: documents.invoice.url,
      }
    : { ...RECEIPT_VIEW, url: documents.receiptUrl }
