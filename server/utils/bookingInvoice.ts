import { escapeHtml, sendTransactionalEmail } from './mail'
import { useStripe } from './stripe'

import type { Database } from '@/types/database.types'
import type { RefundCreditNote } from '@/types/email'
import type { InvoiceLegalField } from '@/types/invoice'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

import { INVOICE_LEGAL_FIELDS, INVOICE_LEGAL_MENTIONS } from '@/constants/invoice'
import { generateCreditNoteAlert } from '@/templates/email/bookingAdminEmail'

type InvoiceCustomField =
  Stripe.Checkout.SessionCreateParams.InvoiceCreation.InvoiceData.CustomField

const CREDIT_NOTE_REASON: Stripe.CreditNoteCreateParams.Reason = 'order_change'

const toCustomField = (field: InvoiceLegalField): InvoiceCustomField => ({
  name: field.label,
  value: field.value,
})

/**
 * Builds the Checkout invoice settings: the invoice is created once the payment succeeds, with
 * the legal mentions of `INVOICE_LEGAL_MENTIONS`.
 * @param bookingId - Booking stored in the invoice metadata
 * @param description - Service and date shown on the invoice
 * @returns `invoice_creation` parameter of the Checkout session
 */
export const bookingInvoiceCreation = (
  bookingId: string,
  description: string,
): Stripe.Checkout.SessionCreateParams.InvoiceCreation => ({
  enabled: true,
  invoice_data: {
    description,
    metadata: { booking_id: bookingId },
    custom_fields: INVOICE_LEGAL_FIELDS.map(toCustomField),
    footer: INVOICE_LEGAL_MENTIONS.footer,
  },
})

/**
 * Reads the invoice Stripe created for a completed Checkout session.
 * @param session - Completed Checkout session
 * @returns Invoice identifier, or null when the session has none
 */
export const sessionInvoiceId = (session: Stripe.Checkout.Session): string | null =>
  typeof session.invoice === 'string' ? session.invoice : (session.invoice?.id ?? null)

/**
 * Links a booking to its Stripe invoice. Only an empty link is written, so a replayed event
 * changes nothing.
 * @param client - Supabase client using the secret key
 * @param bookingId - Booking that was paid
 * @param invoiceId - Invoice of the payment, nothing is written when null
 * @throws 500 when the update fails, so Stripe retries the event
 */
export const storeBookingInvoice = async (
  client: SupabaseClient<Database>,
  bookingId: string,
  invoiceId: string | null,
): Promise<void> => {
  if (!invoiceId) {
    return
  }
  const { error } = await client
    .from('bookings')
    .update({ stripe_invoice_id: invoiceId })
    .eq('id', bookingId)
    .is('stripe_invoice_id', null)
  if (error) {
    console.error(`Invoice link failed for booking ${bookingId}`)
    throw createError({ statusCode: 500, statusMessage: 'Booking invoice update failed' })
  }
}

const sendCreditNoteAlert = async (creditNote: RefundCreditNote): Promise<void> => {
  const { contactEmailTo } = useRuntimeConfig()
  if (!contactEmailTo) {
    console.warn('Credit note alert skipped: NUXT_CONTACT_EMAIL_TO is not set')
    return
  }
  await sendTransactionalEmail(
    {
      to: contactEmailTo,
      ...generateCreditNoteAlert(creditNote, escapeHtml),
      idempotencyKey: `booking-credit-note-alert-${creditNote.bookingId}`,
    },
    `Credit note alert for ${creditNote.bookingId}`,
  )
}

/**
 * Issues the credit note cancelling the invoice of a refunded booking, linked to the refund. Never
 * throws: a failure is logged and BINOVYA is alerted by mail to issue it by hand, the refund stays
 * valid.
 * @param creditNote - Booking, invoice, refund and refunded amount
 */
export const issueRefundCreditNote = async (creditNote: RefundCreditNote): Promise<void> => {
  try {
    await useStripe().creditNotes.create(
      {
        invoice: creditNote.invoiceId,
        amount: creditNote.amountCents,
        refunds: [{ refund: creditNote.refundId }],
        reason: CREDIT_NOTE_REASON,
        metadata: { booking_id: creditNote.bookingId },
      },
      { idempotencyKey: `booking-credit-note-${creditNote.bookingId}` },
    )
  } catch {
    console.error(`Credit note failed for booking ${creditNote.bookingId}`)
    await sendCreditNoteAlert(creditNote)
  }
}
