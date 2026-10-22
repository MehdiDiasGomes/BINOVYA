import { listProductionConfigProblems } from '../utils/productionConfig'

export default defineNitroPlugin((): void => {
  if (import.meta.dev) {
    return
  }
  const { siteUrl, public: publicConfig } = useRuntimeConfig()
  const problems: string[] = listProductionConfigProblems({
    siteUrl,
    publicSiteUrl: publicConfig.siteUrl,
    i18nBaseUrl: publicConfig.i18n?.baseUrl,
    cookieSecure: publicConfig.supabase?.cookieOptions?.secure,
  })
  if (problems.length > 0) {
    throw new Error(`Refusing to start, invalid configuration: ${problems.join('; ')}.`)
  }
})
