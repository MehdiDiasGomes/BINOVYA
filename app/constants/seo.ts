import type { BookingLocale } from '../types/booking'

export const DEFAULT_SEO_LOCALE: BookingLocale = 'fr'

export const SEO_LOCALE_PATH_PREFIXES: Readonly<Record<BookingLocale, string>> = {
  fr: '',
  en: '/en',
}

export const PUBLIC_PAGE_PATHS: readonly string[] = [
  '/',
  '/contact',
  '/booking',
  '/quote',
  '/legal',
  '/privacy',
]

export const PRIVATE_PAGE_PATHS: readonly string[] = ['/login', '/account', '/pro', '/payment-link']

export const PRIVATE_PAGE_ROUTE_PATTERNS: readonly string[] = Object.values(
  SEO_LOCALE_PATH_PREFIXES,
).flatMap((prefix: string): string[] =>
  PRIVATE_PAGE_PATHS.flatMap((path: string): string[] => [
    `${prefix}${path}`,
    `${prefix}${path}/**`,
  ]),
)

export const PRIVATE_PAGE_ROBOTS: string = 'noindex, nofollow'

export const SEO_FILE_CACHE_CONTROL: string = 'public, max-age=3600'

export const OG_LOCALES: Readonly<Record<BookingLocale, string>> = {
  fr: 'fr_FR',
  en: 'en_GB',
}

export const OG_LOCALE_PROPERTIES: readonly string[] = ['og:locale', 'og:locale:alternate']

export const OG_SITE_NAME: string = 'BINOVYA'
