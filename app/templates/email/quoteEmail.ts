import {
  type EmailContact,
  type Escape,
  emailContactFields,
  emailField,
  emailTextBlock,
  renderEmailLayout,
} from '@/templates/email/layout'

type QuoteEmailData = EmailContact & {
  address: string
  equipmentLabel: string
  binsLabel: string
  planLabel: string
  comment: string
  photoUrls: string[]
  photoLinkDays: number
}

const renderPhotoLinks = (urls: string[], escape: Escape): string =>
  urls.map((url, index) => `<a href="${escape(url)}">Photo ${index + 1}</a>`).join(' · ')

/**
 * Builds the email sent to BINOVYA when a customer asks for a quote.
 * @param data - Quote request details, as plain text
 * @param escape - Function escaping untrusted text for HTML
 * @returns Email body as HTML
 */
export const generateQuoteEmailHtml = (data: QuoteEmailData, escape: Escape): string =>
  renderEmailLayout(
    [
      emailContactFields(data, escape),
      emailField('Adresse', escape(data.address)),
      emailField('Équipements', escape(data.equipmentLabel)),
      data.binsLabel ? emailField('Bacs', escape(data.binsLabel)) : '',
      emailField('Fréquence souhaitée', escape(data.planLabel)),
      data.comment ? emailField('Commentaire', emailTextBlock(escape(data.comment))) : '',
      data.photoUrls.length > 0
        ? emailField(
            `Photos (liens valables ${data.photoLinkDays} jours)`,
            renderPhotoLinks(data.photoUrls, escape),
          )
        : '',
    ].join(''),
    'Nouvelle demande de devis BINOVYA',
  )
