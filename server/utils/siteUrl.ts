import type { BookingLocale } from '@/types/booking'
import type { SiteUrlSetting } from '@/types/seo'
import type { H3Event } from 'h3'

import { parseSecureUrl } from '@/utils/link'
import { localizedPagePath } from '@/utils/seo'

/**
 * Parses a configured site URL: https, or local http in development only.
 * @param value - URL from the runtime configuration
 * @returns Parsed URL, or null when it is missing or not allowed in this environment
 */
export const parseSiteUrl = (value: string): URL | null => {
  const url: URL | null = parseSecureUrl(value)
  if (!url || (!import.meta.dev && url.protocol !== 'https:')) {
    return null
  }
  return url
}

const formatSiteUrl = (url: URL): string => {
  const path: string = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname
  return `${url.origin}${path}`
}

/**
 * Returns the public site URL used to build links to the site. Refuses to run without a valid
 * URL, https outside development, local http in development.
 * @returns Site URL without trailing slash, query nor fragment
 * @throws 503 « Site URL unavailable » when `NUXT_SITE_URL` is missing or not allowed
 */
export const resolveSiteUrl = (): string => {
  const url: URL | null = parseSiteUrl(useRuntimeConfig().siteUrl)
  if (!url) {
    console.error('Site URL unavailable: NUXT_SITE_URL is missing or not https')
    throw createError({ statusCode: 503, statusMessage: 'Site URL unavailable' })
  }
  return formatSiteUrl(url)
}

/**
 * Builds an absolute URL to a page of the site in a given locale, French pages having no prefix.
 * @param locale - Locale of the page
 * @param path - Path of the page, starting with a slash, with its query string if any
 * @returns Absolute page URL
 * @throws 503 when the site URL is unavailable, see `resolveSiteUrl`
 */
export const localizedSiteUrl = (locale: BookingLocale, path: string): string =>
  `${resolveSiteUrl()}${localizedPagePath(locale, path)}`

/**
 * Returns the public site URL used for search engine files, or an empty string when
 * `NUXT_PUBLIC_SITE_URL` is missing, or not https outside development.
 * @param event - Current request, so the runtime environment value is read
 * @returns Site URL without trailing slash, or an empty string
 */
export const resolvePublicSiteUrl = (event: H3Event): string => {
  const url: URL | null = parseSiteUrl(useRuntimeConfig(event).public.siteUrl)
  return url ? formatSiteUrl(url) : ''
}

/**
 * Checks that the configured site URLs are all valid and share the same origin.
 * @param settings - Environment variable names and their values
 * @returns Description of the first problem found, or null when the configuration is consistent
 */
export const describeSiteUrlProblem = (settings: SiteUrlSetting[]): string | null => {
  const invalidNames: string[] = settings
    .filter((setting: SiteUrlSetting): boolean => !parseSiteUrl(setting.value))
    .map((setting: SiteUrlSetting): string => setting.name)
  if (invalidNames.length > 0) {
    return `${invalidNames.join(', ')} missing or not https`
  }
  const origins: Set<string | undefined> = new Set(
    settings.map(
      (setting: SiteUrlSetting): string | undefined => parseSiteUrl(setting.value)?.origin,
    ),
  )
  if (origins.size > 1) {
    const names: string = settings.map((setting: SiteUrlSetting): string => setting.name).join(', ')
    return `${names} do not share the same origin`
  }
  return null
}
