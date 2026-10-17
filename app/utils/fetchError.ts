import { FetchError } from 'ofetch'

import { FORBIDDEN_ORIGIN_CODE } from '@/constants/account'

const readNested = (value: unknown, key: string): unknown =>
  typeof value === 'object' && value !== null && key in value
    ? (value as Record<string, unknown>)[key]
    : undefined

/**
 * Reads the business code a server route attaches to an error through `createError({ data })`.
 * @param error - Error thrown by `$fetch`
 * @returns Raw `data.code` of the response, or undefined for any other error
 */
export const readFetchErrorCode = (error: unknown): unknown =>
  error instanceof FetchError ? readNested(readNested(error.data, 'data'), 'code') : undefined

/**
 * Tells whether the server rejected an address whose signed token is missing, altered or expired.
 * @param error - Error thrown by `$fetch`
 * @returns True when the response carries the code `invalidAddress`
 */
export const isInvalidAddressError = (error: unknown): boolean =>
  readFetchErrorCode(error) === 'invalidAddress'

/**
 * Tells whether the server refused a state-changing request because of its `Origin` header, a 403
 * that does not mean the session lost its rights.
 * @param error - Error thrown by `$fetch`
 * @returns True when the response carries the code `forbiddenOrigin`
 */
export const isForbiddenOriginError = (error: unknown): boolean =>
  readFetchErrorCode(error) === FORBIDDEN_ORIGIN_CODE
