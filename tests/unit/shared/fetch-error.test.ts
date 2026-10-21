import { FetchError } from 'ofetch'
import { describe, expect, it } from 'vitest'

import { FORBIDDEN_ORIGIN_CODE } from '../../../app/constants/account'
import {
  isFetchTimeoutError,
  isForbiddenOriginError,
  isInvalidAddressError,
  readFetchErrorCode,
} from '../../../app/utils/fetchError'

const httpError = (data: unknown): FetchError =>
  Object.assign(new FetchError('request failed'), { data })

const timeoutCause = (): Error => Object.assign(new Error('timed out'), { name: 'TimeoutError' })

describe('readFetchErrorCode', () => {
  it('reads the code the server attaches to the error', () => {
    expect(readFetchErrorCode(httpError({ data: { code: 'sameDate' } }))).toBe('sameDate')
  })

  it('is undefined when there is no code or the error is not a fetch error', () => {
    expect(readFetchErrorCode(httpError({ statusCode: 400 }))).toBeUndefined()
    expect(readFetchErrorCode(httpError(undefined))).toBeUndefined()
    expect(readFetchErrorCode({ data: { data: { code: 'sameDate' } } })).toBeUndefined()
    expect(readFetchErrorCode(null)).toBeUndefined()
  })
})

describe('isInvalidAddressError', () => {
  it('is true for the code invalidAddress', () => {
    expect(isInvalidAddressError(httpError({ data: { code: 'invalidAddress' } }))).toBe(true)
  })

  it('is false for another code and for an error that is not a fetch error', () => {
    expect(isInvalidAddressError(httpError({ data: { code: FORBIDDEN_ORIGIN_CODE } }))).toBe(false)
    expect(isInvalidAddressError(new Error('invalidAddress'))).toBe(false)
  })
})

describe('isFetchTimeoutError', () => {
  it('is true for a fetch error without response caused by a TimeoutError', () => {
    expect(isFetchTimeoutError(new FetchError('timeout', { cause: timeoutCause() }))).toBe(true)
  })

  it('is false when a response arrived, whatever the cause', () => {
    const error = Object.assign(new FetchError('failed', { cause: timeoutCause() }), {
      response: new Response(null, { status: 500 }),
    })
    expect(isFetchTimeoutError(error)).toBe(false)
  })

  it('is false for another cause and for an error that is not a fetch error', () => {
    expect(isFetchTimeoutError(new FetchError('offline', { cause: new TypeError('x') }))).toBe(
      false,
    )
    expect(isFetchTimeoutError(new FetchError('no cause'))).toBe(false)
    expect(isFetchTimeoutError(timeoutCause())).toBe(false)
    expect(isFetchTimeoutError(null)).toBe(false)
  })
})

describe('isForbiddenOriginError', () => {
  it('is true for the code the server attaches to a refused Origin', () => {
    expect(isForbiddenOriginError(httpError({ data: { code: FORBIDDEN_ORIGIN_CODE } }))).toBe(true)
  })

  it('is false for another code, a missing code and a plain 403', () => {
    expect(isForbiddenOriginError(httpError({ data: { code: 'invalidAddress' } }))).toBe(false)
    expect(isForbiddenOriginError(httpError({ statusCode: 403 }))).toBe(false)
    expect(isForbiddenOriginError(httpError(undefined))).toBe(false)
  })

  it('is false for an error that is not a fetch error, even with the same shape', () => {
    expect(isForbiddenOriginError(new Error(FORBIDDEN_ORIGIN_CODE))).toBe(false)
    expect(isForbiddenOriginError({ data: { data: { code: FORBIDDEN_ORIGIN_CODE } } })).toBe(false)
    expect(isForbiddenOriginError(null)).toBe(false)
    expect(isForbiddenOriginError(undefined)).toBe(false)
  })
})
