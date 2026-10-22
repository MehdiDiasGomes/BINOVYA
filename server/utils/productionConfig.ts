import { describeSiteUrlProblem } from './siteUrl'

import type { ProductionConfigSettings } from '@/types/config'

/**
 * Lists the configuration problems that must keep a production server from starting.
 * @param settings - Site URLs and session cookie option read from the runtime configuration
 * @returns One description per problem, empty when the configuration is safe
 */
export const listProductionConfigProblems = (settings: ProductionConfigSettings): string[] => {
  const problems: string[] = []
  const siteUrlProblem: string | null = describeSiteUrlProblem([
    { name: 'NUXT_SITE_URL', value: settings.siteUrl },
    { name: 'NUXT_PUBLIC_SITE_URL', value: settings.publicSiteUrl },
    {
      name: 'NUXT_PUBLIC_I18N_BASE_URL',
      value: typeof settings.i18nBaseUrl === 'string' ? settings.i18nBaseUrl : '',
    },
  ])
  if (siteUrlProblem) {
    problems.push(
      `${siteUrlProblem}: canonical links, hreflang, the sitemap and email links would be wrong`,
    )
  }
  if (settings.cookieSecure !== true) {
    problems.push(
      'the session cookie must be Secure: unset NUXT_PUBLIC_SUPABASE_COOKIE_OPTIONS_SECURE',
    )
  }
  return problems
}
