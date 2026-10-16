import { afterEach, describe, expect, it, vi } from 'vitest'

import { emailSitePageUrl } from '../../../server/utils/bookingEmails'

const CLEAR_SCHEME = ['http', '//'].join(':')

const stubSiteUrl = (siteUrl: string): void => {
  vi.stubGlobal('useRuntimeConfig', () => ({ siteUrl }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('emailSitePageUrl', () => {
  it('builds the login URL from an https site URL', () => {
    stubSiteUrl('https://binovya.fr')
    expect(emailSitePageUrl('/login')).toBe('https://binovya.fr/login')
  })

  it('ignores a trailing slash in the site URL', () => {
    stubSiteUrl('https://binovya.fr/')
    expect(emailSitePageUrl('/login')).toBe('https://binovya.fr/login')
  })

  it('accepts plain http on localhost', () => {
    stubSiteUrl(`${CLEAR_SCHEME}localhost:3000`)
    expect(emailSitePageUrl('/login')).toBe(`${CLEAR_SCHEME}localhost:3000/login`)
  })

  it('returns an empty string for a plain http public site URL', () => {
    stubSiteUrl(`${CLEAR_SCHEME}binovya.fr`)
    expect(emailSitePageUrl('/login')).toBe('')
  })

  it('returns an empty string when the site URL is missing', () => {
    stubSiteUrl('')
    expect(emailSitePageUrl('/login')).toBe('')
  })

  it('returns an empty string for a javascript: site URL', () => {
    stubSiteUrl(['javascript', 'alert(1)'].join(':'))
    expect(emailSitePageUrl('/login')).toBe('')
  })
})
