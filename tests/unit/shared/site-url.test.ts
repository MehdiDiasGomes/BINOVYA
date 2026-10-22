import { afterEach, describe, expect, it, vi } from 'vitest'

import { assertCheckoutSiteUrl } from '../../../server/utils/bookingCheckout'
import {
  describeSiteUrlProblem,
  localizedSiteUrl,
  resolvePublicSiteUrl,
  resolveSiteUrl,
} from '../../../server/utils/siteUrl'

import type { H3Event } from 'h3'

type HttpError = Error & { statusCode: number; statusMessage: string }

const stub = (siteUrl: string): void => {
  vi.stubGlobal('useRuntimeConfig', () => ({ siteUrl }))
  vi.stubGlobal('createError', (options: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(options.statusMessage), options),
  )
  vi.stubGlobal('resolveSiteUrl', resolveSiteUrl)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
}

const caught = (action: () => unknown): HttpError | undefined => {
  try {
    action()
  } catch (error) {
    return error as HttpError
  }
  return undefined
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('resolveSiteUrl', () => {
  it('returns an https site URL without trailing slash', () => {
    stub('https://binovya.fr/')
    expect(resolveSiteUrl()).toBe('https://binovya.fr')
  })

  it('answers a neutral 503 when the site URL is missing', () => {
    stub('')
    const error = caught(resolveSiteUrl)
    expect([error?.statusCode, error?.statusMessage]).toEqual([503, 'Site URL unavailable'])
  })

  it('answers 503 for a clear text public site URL outside development', () => {
    stub(['http', '//binovya.fr'].join(':'))
    expect(caught(resolveSiteUrl)?.statusCode).toBe(503)
  })
})

describe('resolveSiteUrl formatting and environment', () => {
  it('answers 503 for local http outside development', () => {
    stub('http://localhost:3000')
    expect(caught(resolveSiteUrl)?.statusCode).toBe(503)
  })

  it('drops the query, the fragment and the trailing slash but keeps the base path', () => {
    stub('https://binovya.fr/base/?x=1#y')
    expect(resolveSiteUrl()).toBe('https://binovya.fr/base')
  })
})

describe('resolvePublicSiteUrl', () => {
  const stubPublic = (siteUrl: string): void => {
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl } }))
  }
  const event: H3Event = {} as H3Event

  it('returns the public site URL without trailing slash', () => {
    stubPublic('https://binovya.fr/')
    expect(resolvePublicSiteUrl(event)).toBe('https://binovya.fr')
  })

  it('returns an empty string when the public site URL is missing', () => {
    stubPublic('')
    expect(resolvePublicSiteUrl(event)).toBe('')
  })

  it('returns an empty string when the public site URL is not a valid URL', () => {
    stubPublic('not a url')
    expect(resolvePublicSiteUrl(event)).toBe('')
  })

  it('returns an empty string for clear text http outside development', () => {
    stubPublic('http://localhost:3000')
    expect(resolvePublicSiteUrl(event)).toBe('')
  })
})

describe('describeSiteUrlProblem', () => {
  it('returns null when every URL is valid and shares the origin', () => {
    expect(
      describeSiteUrlProblem([
        { name: 'NUXT_SITE_URL', value: 'https://binovya.fr' },
        { name: 'NUXT_PUBLIC_SITE_URL', value: 'https://binovya.fr/' },
      ]),
    ).toBeNull()
  })

  it('names the invalid setting', () => {
    const problem: string | null = describeSiteUrlProblem([
      { name: 'NUXT_SITE_URL', value: 'https://binovya.fr' },
      { name: 'NUXT_PUBLIC_SITE_URL', value: '' },
    ])
    expect(problem).toContain('NUXT_PUBLIC_SITE_URL')
    expect(problem).not.toContain('NUXT_SITE_URL,')
  })

  it('reports different origins', () => {
    const problem: string | null = describeSiteUrlProblem([
      { name: 'NUXT_SITE_URL', value: 'https://binovya.fr' },
      { name: 'NUXT_PUBLIC_SITE_URL', value: 'https://binovya.com' },
    ])
    expect(problem).toContain('same origin')
    expect(problem).toContain('NUXT_SITE_URL')
    expect(problem).toContain('NUXT_PUBLIC_SITE_URL')
  })
})

describe('localizedSiteUrl', () => {
  it('has no prefix in French and /en in English', () => {
    stub('https://binovya.fr')
    expect(localizedSiteUrl('fr', '/login')).toBe('https://binovya.fr/login')
    expect(localizedSiteUrl('en', '/login')).toBe('https://binovya.fr/en/login')
  })
})

describe('assertCheckoutSiteUrl', () => {
  it('does nothing with a valid site URL', () => {
    stub('https://binovya.fr')
    expect(caught(assertCheckoutSiteUrl)).toBeUndefined()
  })

  it('keeps the payment specific 503 message', () => {
    stub('')
    const error = caught(assertCheckoutSiteUrl)
    expect([error?.statusCode, error?.statusMessage]).toEqual([503, 'Payment unavailable'])
  })
})
