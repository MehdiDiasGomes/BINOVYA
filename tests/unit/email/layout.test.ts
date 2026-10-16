import { describe, expect, it } from 'vitest'

import { emailFooterLinks, renderEmailLayout } from '../../../app/templates/email/layout'
import { escapeHtml } from '../../../server/utils/mail'

describe('emailFooterLinks', () => {
  it('renders the mail and site links', () => {
    const html: string = emailFooterLinks(
      { siteUrl: 'https://binovya.fr/', contactEmail: 'contact@binovya.fr' },
      escapeHtml,
    )
    expect(html).toContain('<a href="mailto:contact@binovya.fr">contact@binovya.fr</a>')
    expect(html).toContain('<a href="https://binovya.fr/">binovya.fr</a>')
  })

  it('escapes both values', () => {
    const html: string = emailFooterLinks(
      { siteUrl: 'https://binovya.fr/?a="><i>', contactEmail: 'a"><b>@x.fr' },
      escapeHtml,
    )
    expect(html).not.toContain('<b>')
    expect(html).not.toContain('<i>')
    expect(html).toContain('&quot;&gt;&lt;')
  })

  it('omits everything when the configuration is empty', () => {
    expect(emailFooterLinks({ siteUrl: '', contactEmail: '' }, escapeHtml)).toBe('')
  })

  it('omits an unsafe site URL and an invalid address', () => {
    const scriptUrl: string = ['javascript', 'alert(1)'].join(':')
    expect(emailFooterLinks({ siteUrl: scriptUrl, contactEmail: 'a b@c.fr' }, escapeHtml)).toBe('')
  })

  it('omits a public http site URL but keeps a valid address', () => {
    const html: string = emailFooterLinks(
      { siteUrl: ['http', '//binovya.fr'].join(':'), contactEmail: 'contact@binovya.fr' },
      escapeHtml,
    )
    expect(html).toContain('mailto:contact@binovya.fr')
    expect(html).not.toContain('http:')
  })
})

describe('renderEmailLayout', () => {
  const html: string = renderEmailLayout({ title: 'T', preheader: 'Aperçu', content: '<p>C</p>' })

  it('puts the preheader in a hidden block', () => {
    expect(html).toMatch(/<div class="preheader">Aperçu/)
  })

  it('keeps the footer links marker for send time', () => {
    expect(html).toContain('<!--binovya-footer-links-->')
  })

  it('uses the compact look for notifications', () => {
    const notification: string = renderEmailLayout({
      title: 'T',
      preheader: 'p',
      content: '',
      variant: 'notification',
    })
    expect(notification).toContain('class="header header-compact"')
    expect(notification).toContain('Notification automatique')
    expect(html).not.toContain('class="header header-compact"')
  })
})
