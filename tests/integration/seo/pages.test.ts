import { describe, expect, it } from 'vitest'

import { LEGAL_NOTICE_UPDATED_ON, PRIVACY_POLICY_UPDATED_ON } from '../../../app/constants/legal'
import { getApi, type GetResult } from '../../support/api'

const REMOVED_PATHS: string[] = [
  '/formulas',
  '/about',
  '/faq',
  '/solutions/rolling-bins',
  '/solutions/columns',
  '/solutions/bio-waste-shelters',
  '/en/faq',
  '/en/solutions/columns',
]

describe('removed pages', () => {
  it.each(REMOVED_PATHS)('%s answers 404', async (path: string) => {
    const result: GetResult = await getApi(path)
    expect(result.status).toBe(404)
  })
})

describe('legal pages', () => {
  it('/legal exposes its update date in a time element', async () => {
    const { raw } = await getApi('/legal')
    expect(raw).toContain(`<time datetime="${LEGAL_NOTICE_UPDATED_ON}"`)
  })

  it('/en/privacy exposes its update date in a time element', async () => {
    const { raw } = await getApi('/en/privacy')
    expect(raw).toContain(`<time datetime="${PRIVACY_POLICY_UPDATED_ON}"`)
  })

  it('/legal no longer shows the placeholder phone number', async () => {
    const { raw } = await getApi('/legal')
    expect(raw).not.toContain('00 00 00 00 00')
  })
})

describe('language links in the server HTML', () => {
  it('lists both languages on / with the French one current', async () => {
    const { raw } = await getApi('/')
    const nav: string = /<nav[^>]*aria-label="Langue"[\s\S]*?<\/nav>/.exec(raw)?.[0] ?? ''
    expect(nav).not.toBe('')
    const english: string = /<a[^>]*hreflang="en"[^>]*>/.exec(nav)?.[0] ?? ''
    expect(english).toContain('href="/en"')
    expect(english).not.toContain('aria-current')
    const french: string = /<a[^>]*hreflang="fr"[^>]*>/.exec(nav)?.[0] ?? ''
    expect(french).toContain('aria-current="true"')
    expect(french).toContain('href="/"')
  })

  it('keeps the query when switching language from /en/booking', async () => {
    const { raw } = await getApi('/en/booking?service=small-bin')
    const french: string = /<a[^>]*hreflang="fr"[^>]*>/.exec(raw)?.[0] ?? ''
    expect(french).toContain('href="/booking?service=small-bin"')
  })
})
