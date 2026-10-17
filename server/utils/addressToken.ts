import { createHmac, timingSafeEqual } from 'node:crypto'

import type { AddressDetails, AddressKind, BookingAddress, BookingErrorCode } from '@/types/booking'

type TokenKey = {
  secret: string
  kind: AddressKind
}

const TOKEN_CONTEXTS: Record<AddressKind, string> = {
  address: 'binovya-address-v1',
  municipality: 'binovya-municipality-v1',
}
const TOKEN_SEPARATOR: string = '.'
const EXPIRY_PATTERN: RegExp = /^\d{1,15}$/
const MILLISECONDS_PER_SECOND: number = 1000

export const ADDRESS_TOKEN_TTL_SECONDS: number = 24 * 60 * 60

export const ADDRESS_TOKEN_SECRET_MIN_LENGTH: number = 32

export const ADDRESS_TOKEN_MAX_LENGTH: number = 128

const canonicalAddress = (address: AddressDetails, expiresAt: number, kind: AddressKind): string =>
  JSON.stringify([
    TOKEN_CONTEXTS[kind],
    address.label.trim(),
    address.city.trim(),
    address.postcode.trim(),
    address.countryCode,
    address.latitude,
    address.longitude,
    expiresAt,
  ])

const addressMac = (address: AddressDetails, expiresAt: number, key: TokenKey): string =>
  createHmac('sha256', key.secret)
    .update(canonicalAddress(address, expiresAt, key.kind))
    .digest('base64url')

const isSameMac = (received: string, expected: string): boolean => {
  const receivedBytes: Buffer = Buffer.from(received, 'utf8')
  const expectedBytes: Buffer = Buffer.from(expected, 'utf8')
  return (
    receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes)
  )
}

const signToken = (address: AddressDetails, key: TokenKey, now: number): string => {
  const expiresAt: number = Math.floor(now / MILLISECONDS_PER_SECOND) + ADDRESS_TOKEN_TTL_SECONDS
  return `${expiresAt}${TOKEN_SEPARATOR}${addressMac(address, expiresAt, key)}`
}

const verifyToken = (address: BookingAddress, key: TokenKey, now: number): boolean => {
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
  return isSameMac(receivedMac, addressMac(address, expiresAt, key))
}

/**
 * Signs an address returned by the geocoders so the booking can trust its coordinates.
 * @param address - Address suggestion: label, city, postcode, country and coordinates
 * @param secret - HMAC secret, at least 32 characters
 * @param now - Current time in milliseconds, injectable for tests
 * @returns Token `<expiresAt>.<mac>`: expiry in Unix seconds, then the base64url HMAC-SHA256 of
 * the address fields and that expiry, in the address context
 */
export const signAddressToken = (
  address: AddressDetails,
  secret: string,
  now: number = Date.now(),
): string => signToken(address, { secret, kind: 'address' }, now)

/**
 * Signs a municipality returned by the geocoders, in a context of its own so the token is refused
 * wherever a booking address is expected, and the reverse.
 * @param municipality - Municipality suggestion: label, name, postcode, country and centre
 * @param secret - HMAC secret, at least 32 characters
 * @param now - Current time in milliseconds, injectable for tests
 * @returns Token `<expiresAt>.<mac>`, same format as `signAddressToken`
 */
export const signMunicipalityToken = (
  municipality: AddressDetails,
  secret: string,
  now: number = Date.now(),
): string => signToken(municipality, { secret, kind: 'municipality' }, now)

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
): boolean => verifyToken(address, { secret, kind: 'address' }, now)

/**
 * Checks that a municipality and its token were issued together by the municipality search and
 * that the token has not expired. An address token never passes.
 * @param municipality - Municipality received from the browser, with its token
 * @param secret - HMAC secret used to sign the suggestions
 * @param now - Current time in milliseconds, injectable for tests
 * @returns True when the token matches the municipality fields and is still valid
 */
export const verifyMunicipalityToken = (
  municipality: BookingAddress,
  secret: string,
  now: number = Date.now(),
): boolean => verifyToken(municipality, { secret, kind: 'municipality' }, now)

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

const rejectUnsigned = (statusMessage: string): never => {
  throw createError({
    statusCode: 400,
    statusMessage,
    data: { code: 'invalidAddress' satisfies BookingErrorCode },
  })
}

/**
 * Rejects an address whose token was not issued by the address search for these exact fields, or
 * has expired. Shared by every route that trusts the coordinates of an address.
 * @param address - Address received from the browser, with its token
 * @throws 400 error with the code `invalidAddress` when the token does not match
 */
export const requireSignedAddress = (address: BookingAddress): void => {
  if (!verifyAddressToken(address, readAddressTokenSecret())) {
    rejectUnsigned('Invalid address')
  }
}

/**
 * Rejects a municipality whose token was not issued by the municipality search for these exact
 * fields, or has expired. An address token is refused.
 * @param municipality - Municipality received from the browser, with its token
 * @throws 400 error with the code `invalidAddress` when the token does not match
 */
export const requireSignedMunicipality = (municipality: BookingAddress): void => {
  if (!verifyMunicipalityToken(municipality, readAddressTokenSecret())) {
    rejectUnsigned('Invalid municipality')
  }
}
