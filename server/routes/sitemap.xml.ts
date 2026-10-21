import type { BookingLocale } from '@/types/booking'

import { DEFAULT_SEO_LOCALE, PUBLIC_PAGE_PATHS, SEO_LOCALE_PATH_PREFIXES } from '@/constants/seo'
import { localizedPagePath } from '@/utils/seo'

const SITEMAP_LOCALES: BookingLocale[] = Object.keys(SEO_LOCALE_PATH_PREFIXES) as BookingLocale[]

const alternateLink = (hreflang: string, href: string): string =>
  `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(href)}"/>`

const sitemapEntry = (siteUrl: string, locale: BookingLocale, path: string): string => {
  const alternates: string[] = SITEMAP_LOCALES.map(alternateLocale =>
    alternateLink(alternateLocale, `${siteUrl}${localizedPagePath(alternateLocale, path)}`),
  )
  alternates.push(
    alternateLink('x-default', `${siteUrl}${localizedPagePath(DEFAULT_SEO_LOCALE, path)}`),
  )
  const location: string = `${siteUrl}${localizedPagePath(locale, path)}`
  return ['  <url>', `    <loc>${escapeHtml(location)}</loc>`, ...alternates, '  </url>'].join('\n')
}

export default defineEventHandler((event): string => {
  const siteUrl: string = resolvePublicSiteUrl(event)
  if (!siteUrl) {
    console.error('Sitemap unavailable: NUXT_PUBLIC_SITE_URL is missing or not https')
    throw createError({ statusCode: 503, statusMessage: 'Sitemap unavailable' })
  }
  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  const entries: string[] = PUBLIC_PAGE_PATHS.flatMap(path =>
    SITEMAP_LOCALES.map(locale => sitemapEntry(siteUrl, locale, path)),
  )
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n')
})
