import type { BookingLocale } from '@/types/booking'

import { PRIVATE_PAGE_PATHS, SEO_LOCALE_PATH_PREFIXES } from '@/constants/seo'

/**
 * Builds the path of a page in a given locale, French pages having no prefix.
 * @param locale - Locale of the page
 * @param path - Path of the page without locale prefix, starting with a slash
 * @returns Localized path, `/en` for the English home page
 */
export const localizedPagePath = (locale: BookingLocale, path: string): string => {
  const prefix: string = SEO_LOCALE_PATH_PREFIXES[locale]
  if (!prefix) {
    return path
  }
  return path === '/' ? prefix : `${prefix}${path}`
}

/**
 * Removes the locale prefix of a localized path.
 * @param path - Path of the current route
 * @returns Path without locale prefix, `/` for a home page
 */
export const pathWithoutLocalePrefix = (path: string): string => {
  for (const prefix of Object.values(SEO_LOCALE_PATH_PREFIXES)) {
    if (prefix && path === prefix) {
      return '/'
    }
    if (prefix && path.startsWith(`${prefix}/`)) {
      return path.slice(prefix.length)
    }
  }
  return path
}

/**
 * Tells whether a path belongs to a private area kept out of search engines.
 * @param path - Path of the current route, with or without locale prefix
 * @returns True for the login, customer area, Pro space and payment link pages
 */
export const isPrivatePagePath = (path: string): boolean => {
  const unprefixedPath: string = pathWithoutLocalePrefix(path)
  return PRIVATE_PAGE_PATHS.some(
    privatePath => unprefixedPath === privatePath || unprefixedPath.startsWith(`${privatePath}/`),
  )
}
