import { afterEach, describe, expect, it, vi } from 'vitest'

import { assertCheckoutSiteUrl } from '../../../server/utils/bookingCheckout'
import { localizedSiteUrl, resolveSiteUrl } from '../../../server/utils/siteUrl'

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
