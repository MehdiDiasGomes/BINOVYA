import type { InvoiceLegalField, InvoiceLegalMentions } from '@/types/invoice'

/**
 * Legal mentions printed on every Stripe invoice and credit note. PLACEHOLDERS ONLY: every value
 * is fake and must be replaced by the real company details before production. The seller address
 * and logo come from the Stripe account settings, not from here.
 */
export const INVOICE_LEGAL_MENTIONS: InvoiceLegalMentions = {
  sellerLegalName: 'Lorem Ipsum',
  legalForm: 'Lorem ipsum au capital de 0 €',
  siret: '000 000 000 00000 (lorem ipsum)',
  registration: 'RCS Lorem Ipsum 000 000 000',
  vatMention: 'Lorem ipsum dolor sit amet (mention TVA à définir)',
  footer:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
}

/**
 * Custom fields of the invoice built from the legal mentions: at most 4 (Stripe limit), each label
 * up to 40 characters and each value up to 140.
 */
export const INVOICE_LEGAL_FIELDS: InvoiceLegalField[] = [
  {
    label: 'Vendeur',
    value: `${INVOICE_LEGAL_MENTIONS.sellerLegalName}, ${INVOICE_LEGAL_MENTIONS.legalForm}`,
  },
  { label: 'SIRET', value: INVOICE_LEGAL_MENTIONS.siret },
  { label: 'RCS / RM', value: INVOICE_LEGAL_MENTIONS.registration },
  { label: 'TVA', value: INVOICE_LEGAL_MENTIONS.vatMention },
]
