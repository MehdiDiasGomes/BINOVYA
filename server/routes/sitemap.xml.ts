import { escapeXml } from '../utils/xml'

import type { BookingLocale } from '@/types/booking'
import type { H3Event } from 'h3'

import {
  DEFAULT_SEO_LOCALE,
  PUBLIC_PAGE_PATHS,
  SEO_FILE_CACHE_CONTROL,
  SEO_LOCALE_PATH_PREFIXES,
} from '@/constants/seo'
import { localizedPageUrl } from '@/utils/seo'

const SITEMAP_LOCALES: BookingLocale[] = Object.keys(SEO_LOCALE_PATH_PREFIXES) as BookingLocale[]

const alternateLink = (hreflang: string, href: string): string =>
  `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(href)}"/>`

const sitemapEntry = (siteUrl: string, locale: BookingLocale, path: string): string => {
  const alternates: string[] = SITEMAP_LOCALES.map((alternateLocale: BookingLocale): string =>
    alternateLink(alternateLocale, localizedPageUrl(siteUrl, alternateLocale, path)),
  )
  alternates.push(alternateLink('x-default', localizedPageUrl(siteUrl, DEFAULT_SEO_LOCALE, path)))
  const location: string = localizedPageUrl(siteUrl, locale, path)
  return ['  <url>', `    <loc>${escapeXml(location)}</loc>`, ...alternates, '  </url>'].join('\n')
}

export default defineEventHandler((event: H3Event): string => {
  const siteUrl: string = resolvePublicSiteUrl(event)
  if (!siteUrl) {
    throw createError({ statusCode: 503, statusMessage: 'Sitemap unavailable' })
  }
  setResponseHeaders(event, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': SEO_FILE_CACHE_CONTROL,
  })
  const entries: string[] = PUBLIC_PAGE_PATHS.flatMap((path: string): string[] =>
    SITEMAP_LOCALES.map((locale: BookingLocale): string => sitemapEntry(siteUrl, locale, path)),
  )
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n')
})
