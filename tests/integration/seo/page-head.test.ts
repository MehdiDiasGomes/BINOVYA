import { describe, expect, it } from 'vitest'

import { OG_LOCALES, OG_SITE_NAME } from '../../../app/constants/seo'
import { getApi, type GetResult } from '../../support/api'
import { BASE_URL } from '../../support/env'

const PRIVATE_X_ROBOTS: string = 'noindex, nofollow'
const PRIVATE_PATHS: string[] = ['/login', '/en/account', '/pro/login', '/payment-link']
const PUBLIC_PATHS: string[] = ['/', '/en/contact']

const tagsOf = (html: string, name: string): string[] =>
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match => match[0])

const metaContents = (html: string, property: string): string[] =>
  tagsOf(html, 'meta')
    .filter(tag => new RegExp(`(?:property|name)="${property}"`).test(tag))
    .map(tag => /content="([^"]*)"/.exec(tag)?.[1] ?? '')

const links = (html: string, rel: string): string[] =>
  tagsOf(html, 'link').filter(tag => new RegExp(`rel="${rel}"`).test(tag))

const page = async (path: string): Promise<GetResult> => {
  const result: GetResult = await getApi(path)
  expect(result.status).toBe(200)
  return result
}

describe('X-Robots-Tag header', () => {
  it.each(PRIVATE_PATHS)('%s carries noindex, nofollow', async (path: string) => {
    const result: GetResult = await getApi(path)
    expect(result.headers.get('x-robots-tag')).toBe(PRIVATE_X_ROBOTS)
  })

  it.each(PUBLIC_PATHS)('%s does not carry it', async (path: string) => {
    const result: GetResult = await page(path)
    expect(result.headers.get('x-robots-tag')).toBeNull()
  })
})

describe('html language', () => {
  it('is fr on the French home page', async () => {
    expect((await page('/')).raw).toMatch(/<html[^>]*\blang="fr"/)
  })

  it('is en on the English home page', async () => {
    expect((await page('/en')).raw).toMatch(/<html[^>]*\blang="en"/)
  })
})

describe('canonical and alternates on a public page', () => {
  it('drops the query from the canonical link of /booking?service=small-bin', async () => {
    const { raw } = await page('/booking?service=small-bin')
    const canonical: string[] = links(raw, 'canonical')
    expect(canonical).toHaveLength(1)
    expect(canonical[0]).toContain(`href="${BASE_URL}/booking"`)
  })

  it('points the French home canonical to the bare site URL', async () => {
    const { raw } = await page('/')
    expect(links(raw, 'canonical')[0]).toContain(`href="${BASE_URL}"`)
  })

  it('declares fr, en and x-default alternates', async () => {
    const alternates: string[] = links((await page('/contact')).raw, 'alternate')
    expect(alternates.some(tag => tag.includes('hreflang="fr"'))).toBe(true)
    expect(alternates.some(tag => tag.includes(`hreflang="en"`))).toBe(true)
    const xDefault: string | undefined = alternates.find(tag =>
      tag.includes('hreflang="x-default"'),
    )
    expect(xDefault).toContain(`href="${BASE_URL}/contact"`)
  })
})

describe('Open Graph and Twitter tags', () => {
  it('uses fr_FR with en_GB alternate on a French page', async () => {
    const { raw } = await page('/contact')
    expect(metaContents(raw, 'og:locale')).toEqual([OG_LOCALES.fr])
    expect(metaContents(raw, 'og:locale:alternate')).toEqual([OG_LOCALES.en])
  })

  it('uses en_GB with fr_FR alternate on an English page', async () => {
    const { raw } = await page('/en/contact')
    expect(metaContents(raw, 'og:locale')).toEqual([OG_LOCALES.en])
    expect(metaContents(raw, 'og:locale:alternate')).toEqual([OG_LOCALES.fr])
  })

  it('sets og:site_name and twitter:card summary on a public page', async () => {
    const { raw } = await page('/')
    expect(metaContents(raw, 'og:site_name')).toEqual([OG_SITE_NAME])
    expect(metaContents(raw, 'twitter:card')).toEqual(['summary'])
  })
})

describe('private page head', () => {
  it.each(['/login', '/en/login', '/pro/login'])(
    '%s has no canonical, hreflang, og:locale, og:site_name nor twitter:card',
    async (path: string) => {
      const { raw } = await page(path)
      expect(links(raw, 'canonical')).toEqual([])
      expect(links(raw, 'alternate').filter(tag => tag.includes('hreflang'))).toEqual([])
      expect(metaContents(raw, 'og:locale')).toEqual([])
      expect(metaContents(raw, 'og:site_name')).toEqual([])
      expect(metaContents(raw, 'twitter:card')).toEqual([])
    },
  )
})
