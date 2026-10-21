import { describe, expect, it } from 'vitest'

import { generateAdminLoginLinkEmail } from '../../../app/templates/email/accountEmails'
import { escapeHtml } from '../../../server/utils/mail'

const LOGIN_URL = 'https://binovya.fr/pro/confirm#token_hash=abc123'

describe('generateAdminLoginLinkEmail', () => {
  const email = generateAdminLoginLinkEmail({ loginUrl: LOGIN_URL }, escapeHtml)

  it('has the Pro login subject', () => {
    expect(email.subject).toBe('Votre lien de connexion à BINOVYA Pro')
  })

  it('has a "Me connecter" button to the Pro confirm page', () => {
    expect(email.html).toMatch(/class="button"[^>]*>Me connecter<\/a>/)
    expect(email.html).toContain(`href="${LOGIN_URL}"`)
  })

  it('escapes the link', () => {
    const hostile = generateAdminLoginLinkEmail(
      { loginUrl: '"><script>alert(1)</script>' },
      escapeHtml,
    )
    expect(hostile.html).not.toContain('<script')
  })
})
