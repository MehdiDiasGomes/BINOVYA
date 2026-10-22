import { describe, expect, it } from 'vitest'

import { listProductionConfigProblems } from '../../../server/utils/productionConfig'

import type { ProductionConfigSettings } from '../../../app/types/config'

const SITE_URL: string = 'https://binovya.com'

const INSECURE_SITE_URL: string = SITE_URL.replace('https', 'http')

const validSettings = (
  patch: Partial<ProductionConfigSettings> = {},
): ProductionConfigSettings => ({
  siteUrl: SITE_URL,
  publicSiteUrl: SITE_URL,
  i18nBaseUrl: SITE_URL,
  cookieSecure: true,
  ...patch,
})

describe('listProductionConfigProblems', () => {
  it('returns no problem for coherent https URLs and a Secure session cookie', () => {
    expect(listProductionConfigProblems(validSettings())).toEqual([])
  })

  it('reports URLs that do not share the same origin', () => {
    const problems: string[] = listProductionConfigProblems(
      validSettings({ publicSiteUrl: 'https://www.binovya.com' }),
    )
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('do not share the same origin')
  })

  it('reports an http site URL', () => {
    const problems: string[] = listProductionConfigProblems(
      validSettings({ siteUrl: INSECURE_SITE_URL }),
    )
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('NUXT_SITE_URL')
  })

  it('reports a missing site URL', () => {
    const problems: string[] = listProductionConfigProblems(validSettings({ publicSiteUrl: '' }))
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('NUXT_PUBLIC_SITE_URL')
  })

  it('reports an i18n base URL that is not a string', () => {
    const problems: string[] = listProductionConfigProblems(validSettings({ i18nBaseUrl: 42 }))
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('NUXT_PUBLIC_I18N_BASE_URL')
  })

  it('reports a session cookie that is not Secure', () => {
    const problems: string[] = listProductionConfigProblems(validSettings({ cookieSecure: false }))
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('Secure')
  })

  it('reports a session cookie option that is not set', () => {
    const problems: string[] = listProductionConfigProblems(
      validSettings({ cookieSecure: undefined }),
    )
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('Secure')
  })

  it('reports the URL problem and the cookie problem together', () => {
    const problems: string[] = listProductionConfigProblems(
      validSettings({ siteUrl: INSECURE_SITE_URL, cookieSecure: false }),
    )
    expect(problems).toHaveLength(2)
  })
})
