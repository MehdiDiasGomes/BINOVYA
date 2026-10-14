type QuoteEmailData = {
  firstName: string
  lastName: string
  company: string
  email: string
  phone: string
  address: string
  binsLabel: string
  planLabel: string
  comment: string
  photoUrls: string[]
}

type Escape = (text: string) => string

const field = (label: string, value: string): string => `
  <div class="field">
    <div class="label">${label}</div>
    <div class="value">${value}</div>
  </div>`

/**
 * Builds the email sent to BINOVYA when a customer asks for a quote.
 * @param data - Quote request details, as plain text
 * @param escape - Function escaping untrusted text for HTML
 * @returns Email body as HTML
 */
export const generateQuoteEmailHtml = (data: QuoteEmailData, escape: Escape): string => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; }
        .content { padding: 40px; }
        .field { margin-bottom: 24px; }
        .label { font-size: 12px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .value { font-size: 15px; color: #000000; line-height: 1.5; }
        .value a { color: #0b7fb8; }
        .comment { white-space: pre-wrap; padding: 16px; background-color: #f9f9f9; border-radius: 4px; line-height: 1.6; }
        .footer { padding: 20px 40px; text-align: center; font-size: 12px; color: #999999; border-top: 1px solid #e5e5e5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          ${field('Nom', `${escape(data.lastName)} ${escape(data.firstName)}`)}
          ${data.company ? field('Société', escape(data.company)) : ''}
          ${field('Email', `<a href="mailto:${escape(data.email)}">${escape(data.email)}</a>`)}
          ${field('Téléphone', `<a href="tel:${escape(data.phone)}">${escape(data.phone)}</a>`)}
          ${field('Adresse', escape(data.address))}
          ${field('Bacs', escape(data.binsLabel))}
          ${field('Fréquence souhaitée', escape(data.planLabel))}
          ${data.comment ? field('Commentaire', `<div class="comment">${escape(data.comment)}</div>`) : ''}
          ${
            data.photoUrls.length > 0
              ? field(
                  'Photos (liens valables 7 jours)',
                  data.photoUrls
                    .map((url, index) => `<a href="${escape(url)}">Photo ${index + 1}</a>`)
                    .join(' · '),
                )
              : ''
          }
        </div>
        <div class="footer">Nouvelle demande de devis BINOVYA</div>
      </div>
    </body>
  </html>
`
