import type { BookingLocale } from '@/types/booking'

/**
 * Returns the public site URL used to build links to the site. Refuses to run without it, and
 * outside development without https.
 * @returns Site URL without trailing slash
 * @throws 503 « Site URL unavailable » when `NUXT_SITE_URL` is missing or not https
 */
export const resolveSiteUrl = (): string => {
  const { siteUrl } = useRuntimeConfig()
  if (!siteUrl || (!import.meta.dev && !siteUrl.startsWith('https://'))) {
    console.error('Site URL unavailable: NUXT_SITE_URL is missing or not https')
    throw createError({ statusCode: 503, statusMessage: 'Site URL unavailable' })
  }
  return siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl
}

/**
 * Builds an absolute URL to a page of the site in a given locale, French pages having no prefix.
 * @param locale - Locale of the page
 * @param path - Path of the page, starting with a slash, with its query string if any
 * @returns Absolute page URL
 * @throws 503 when the site URL is unavailable, see `resolveSiteUrl`
 */
export const localizedSiteUrl = (locale: BookingLocale, path: string): string => {
  const localePrefix: string = locale === 'fr' ? '' : `/${locale}`
  return `${resolveSiteUrl()}${localePrefix}${path}`
}
