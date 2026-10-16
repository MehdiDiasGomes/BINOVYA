import { createHmac, timingSafeEqual } from 'node:crypto'

import type { AddressDetails, BookingAddress, BookingErrorCode } from '@/types/booking'

const TOKEN_CONTEXT: string = 'binovya-address-v1'
const TOKEN_SEPARATOR: string = '.'
const EXPIRY_PATTERN: RegExp = /^\d{1,15}$/
const MILLISECONDS_PER_SECOND: number = 1000

export const ADDRESS_TOKEN_TTL_SECONDS: number = 24 * 60 * 60

export const ADDRESS_TOKEN_SECRET_MIN_LENGTH: number = 32

export const ADDRESS_TOKEN_MAX_LENGTH: number = 128

const canonicalAddress = (address: AddressDetails, expiresAt: number): string =>
  JSON.stringify([
    TOKEN_CONTEXT,
    address.label.trim(),
    address.city.trim(),
    address.postcode.trim(),
    address.countryCode,
    address.latitude,
    address.longitude,
    expiresAt,
  ])

const addressMac = (address: AddressDetails, expiresAt: number, secret: string): string =>
  createHmac('sha256', secret).update(canonicalAddress(address, expiresAt)).digest('base64url')

const isSameMac = (received: string, expected: string): boolean => {
  const receivedBytes: Buffer = Buffer.from(received, 'utf8')
  const expectedBytes: Buffer = Buffer.from(expected, 'utf8')
  return (
    receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes)
  )
}

/**
 * Signs an address returned by the geocoders so the booking can trust its coordinates.
 * @param address - Address suggestion: label, city, postcode, country and coordinates
 * @param secret - HMAC secret, at least 32 characters
 * @param now - Current time in milliseconds, injectable for tests
 * @returns Token `<expiresAt>.<mac>`: expiry in Unix seconds, then the base64url HMAC-SHA256 of
 * the address fields and that expiry
 */
export const signAddressToken = (
  address: AddressDetails,
  secret: string,
  now: number = Date.now(),
): string => {
  const expiresAt: number = Math.floor(now / MILLISECONDS_PER_SECOND) + ADDRESS_TOKEN_TTL_SECONDS
  return `${expiresAt}${TOKEN_SEPARATOR}${addressMac(address, expiresAt, secret)}`
}

/**
 * Checks that an address and its token were issued together by the address search and that the
 * token has not expired. Compares the HMAC in constant time.
 * @param address - Address received from the browser, with its token
 * @param secret - HMAC secret used to sign the suggestions
 * @param now - Current time in milliseconds, injectable for tests
 * @returns True when the token matches the address fields and is still valid
 */
export const verifyAddressToken = (
  address: BookingAddress,
  secret: string,
  now: number = Date.now(),
): boolean => {
  const separatorIndex: number = address.token.indexOf(TOKEN_SEPARATOR)
  const rawExpiry: string = address.token.slice(0, Math.max(separatorIndex, 0))
  if (separatorIndex < 0 || !EXPIRY_PATTERN.test(rawExpiry)) {
    return false
  }
  const expiresAt: number = Number(rawExpiry)
  if (expiresAt * MILLISECONDS_PER_SECOND <= now) {
    return false
  }
  const receivedMac: string = address.token.slice(separatorIndex + TOKEN_SEPARATOR.length)
  return isSameMac(receivedMac, addressMac(address, expiresAt, secret))
}

/**
 * Reads the address signing secret from the runtime config and fails closed when it is missing
 * or too short, logging the variable name only.
 * @returns Secret of `NUXT_ADDRESS_TOKEN_SECRET`
 * @throws 500 error when the secret is missing or shorter than 32 characters
 */
export const readAddressTokenSecret = (): string => {
  const secret: string = String(useRuntimeConfig().addressTokenSecret)
  if (secret.length < ADDRESS_TOKEN_SECRET_MIN_LENGTH) {
    console.error(
      `NUXT_ADDRESS_TOKEN_SECRET is missing or shorter than ${ADDRESS_TOKEN_SECRET_MIN_LENGTH} characters`,
    )
    throw createError({ statusCode: 500, statusMessage: 'Address signing unavailable' })
  }
  return secret
}

/**
 * Rejects an address whose token was not issued by the address search for these exact fields, or
 * has expired. Shared by every route that trusts the coordinates of an address.
 * @param address - Address received from the browser, with its token
 * @throws 400 error with the code `invalidAddress` when the token does not match
 */
export const requireSignedAddress = (address: BookingAddress): void => {
  if (!verifyAddressToken(address, readAddressTokenSecret())) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid address',
      data: { code: 'invalidAddress' satisfies BookingErrorCode },
    })
  }
}
