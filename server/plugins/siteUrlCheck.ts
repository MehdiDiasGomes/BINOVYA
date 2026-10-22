import { describeSiteUrlProblem } from '../utils/siteUrl'

export default defineNitroPlugin((): void => {
  if (import.meta.dev) {
    return
  }
  const { siteUrl, public: publicConfig } = useRuntimeConfig()
  const i18nBaseUrl: unknown = publicConfig.i18n?.baseUrl
  const problem: string | null = describeSiteUrlProblem([
    { name: 'NUXT_SITE_URL', value: siteUrl },
    { name: 'NUXT_PUBLIC_SITE_URL', value: publicConfig.siteUrl },
    {
      name: 'NUXT_PUBLIC_I18N_BASE_URL',
      value: typeof i18nBaseUrl === 'string' ? i18nBaseUrl : '',
    },
  ])
  if (problem) {
    console.error(
      `Site URL configuration: ${problem}. Canonical links, hreflang, the sitemap and email links may be wrong.`,
    )
  }
})
