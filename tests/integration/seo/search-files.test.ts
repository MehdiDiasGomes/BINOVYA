import { describe, expect, it } from 'vitest'

import {
  PRIVATE_PAGE_PATHS,
  PUBLIC_PAGE_PATHS,
  SEO_FILE_CACHE_CONTROL,
} from '../../../app/constants/seo'
import { localizedPageUrl } from '../../../app/utils/seo'
import { getApi, type GetResult } from '../../support/api'
import { BASE_URL } from '../../support/env'

const LOC: RegExp = /<loc>([^<]+)<\/loc>/g

const locations = (xml: string): string[] => [...xml.matchAll(LOC)].map(match => match[1] ?? '')

describe('GET /robots.txt', () => {
  it('forbids the API and points to the sitemap on the public URL', async () => {
    const result: GetResult = await getApi('/robots.txt')
    expect(result.status).toBe(200)
    expect(result.headers.get('content-type')).toContain('text/plain')
    expect(result.raw).toContain('User-agent: *')
    expect(result.raw).toContain('Disallow: /api/')
    expect(result.raw.split('\n')).toContain(`Sitemap: ${BASE_URL}/sitemap.xml`)
  })

  it('is cached for an hour', async () => {
    const result: GetResult = await getApi('/robots.txt')
    expect(result.headers.get('cache-control')).toBe(SEO_FILE_CACHE_CONTROL)
  })

  it('does not disallow a page that relies on noindex', async () => {
    const result: GetResult = await getApi('/robots.txt')
    PRIVATE_PAGE_PATHS.forEach(path => expect(result.raw).not.toContain(`Disallow: ${path}`))
  })
})

describe('GET /sitemap.xml', () => {
  it('lists each public page in both languages, 12 locations', async () => {
    const result: GetResult = await getApi('/sitemap.xml')
    expect(result.status).toBe(200)
    expect(result.headers.get('content-type')).toContain('application/xml')
    expect(result.headers.get('cache-control')).toBe(SEO_FILE_CACHE_CONTROL)
    const found: string[] = locations(result.raw)
    const entries: string[] = result.raw.split('<url>').slice(1)
    const urls: string[] = entries.map(entry => locations(entry)[0] ?? '')
    expect(urls).toHaveLength(PUBLIC_PAGE_PATHS.length * 2)
    const expected: string[] = PUBLIC_PAGE_PATHS.flatMap(path => [
      localizedPageUrl(BASE_URL, 'fr', path),
      localizedPageUrl(BASE_URL, 'en', path),
    ])
    expect(urls.sort()).toEqual(expected.sort())
    expect(urls).toContain(BASE_URL)
    expect(found.every(url => url.startsWith(BASE_URL))).toBe(true)
  })

  it('lists no private path', async () => {
    const result: GetResult = await getApi('/sitemap.xml')
    PRIVATE_PAGE_PATHS.forEach(path => expect(result.raw).not.toContain(`${BASE_URL}${path}`))
    PRIVATE_PAGE_PATHS.forEach(path => expect(result.raw).not.toContain(`${BASE_URL}/en${path}`))
  })

  it('gives each entry the fr, en and x-default alternates', async () => {
    const result: GetResult = await getApi('/sitemap.xml')
    const entries: string[] = result.raw.split('<url>').slice(1)
    expect(entries).toHaveLength(PUBLIC_PAGE_PATHS.length * 2)
    entries.forEach(entry => {
      expect(entry).toContain('hreflang="fr"')
      expect(entry).toContain('hreflang="en"')
      expect(entry).toContain(`hreflang="x-default" href="${localizedXDefault(entry)}"`)
    })
  })
})

const localizedXDefault = (entry: string): string => {
  const frHref: string = /hreflang="fr" href="([^"]+)"/.exec(entry)?.[1] ?? ''
  return frHref
}
