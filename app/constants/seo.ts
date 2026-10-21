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
).flatMap(prefix => PRIVATE_PAGE_PATHS.flatMap(path => [`${prefix}${path}`, `${prefix}${path}/**`]))

export const PRIVATE_PAGE_ROBOTS: string = 'noindex, nofollow'
