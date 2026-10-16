import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { assertSameOrigin } from '../../../server/utils/requestOrigin'

import type { H3Event } from 'h3'

type HttpError = Error & { statusCode: number; statusMessage: string }

const CLEAR_SCHEME = ['http', '//'].join(':')

const EVENT = {} as H3Event

const setup = (options: { origin?: string; siteUrl?: string; requestOrigin?: string }): void => {
  vi.stubGlobal('getRequestHeader', () => options.origin)
  vi.stubGlobal('resolveSiteUrl', () => options.siteUrl ?? 'https://binovya.fr')
  vi.stubGlobal('getRequestURL', () => new URL(options.requestOrigin ?? 'https://binovya.fr/api'))
  vi.stubGlobal('createError', (error: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(error.statusMessage), error),
  )
}

const catchError = (): HttpError | undefined => {
  try {
    assertSameOrigin(EVENT)
  } catch (error) {
    return error as HttpError
  }
  return undefined
}

beforeEach(() => {
  setup({})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('assertSameOrigin', () => {
  it('accepts an Origin equal to the site URL', () => {
    setup({ origin: 'https://binovya.fr' })
    expect(catchError()).toBeUndefined()
  })

  it('accepts when the configured site URL has a path or trailing slash', () => {
    setup({ origin: 'https://binovya.fr', siteUrl: 'https://binovya.fr/' })
    expect(catchError()).toBeUndefined()
  })

  it('rejects a missing Origin with 403 Forbidden origin', () => {
    setup({ origin: undefined })
    const error = catchError()
    expect(error?.statusCode).toBe(403)
    expect(error?.statusMessage).toBe('Forbidden origin')
  })

  it('rejects an empty Origin', () => {
    setup({ origin: '' })
    expect(catchError()?.statusCode).toBe(403)
  })

  it('rejects a foreign Origin', () => {
    setup({ origin: 'https://evil.example.com' })
    expect(catchError()?.statusCode).toBe(403)
  })

  it('rejects a look-alike Origin', () => {
    setup({ origin: 'https://binovya.fr.evil.example.com' })
    expect(catchError()?.statusCode).toBe(403)
  })

  it('rejects the same host on another scheme', () => {
    setup({ origin: `${CLEAR_SCHEME}binovya.fr` })
    expect(catchError()?.statusCode).toBe(403)
  })

  it('rejects the literal Origin "null"', () => {
    setup({ origin: 'null' })
    expect(catchError()?.statusCode).toBe(403)
  })

  it('does not accept the request own origin outside development', () => {
    setup({
      origin: `${CLEAR_SCHEME}localhost:3000`,
      requestOrigin: `${CLEAR_SCHEME}localhost:3000/api`,
    })
    expect(catchError()?.statusCode).toBe(403)
  })
})
