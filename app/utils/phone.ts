import type { CountryCode } from '@/types/booking'

import { COUNTRY_DIAL_CODES } from '@/constants/booking'

const FRENCH_PHONE_PATTERN: RegExp = /^\+33[1-9]\d{8}$/
const LUXEMBOURG_PHONE_PATTERN: RegExp = /^\+352\d{6,9}$/
const FRENCH_NATIONAL_PHONE_PATTERN: RegExp = /^0[1-9]\d{8}$/

const pairDigits = (digits: string): string => digits.match(/\d{2}/g)?.join(' ') ?? digits

const tripleDigits = (digits: string): string => digits.match(/\d{3}/g)?.join(' ') ?? digits

const groupLuxembourgDigits = (digits: string): string => {
  if (digits.length % 2 === 0) {
    return pairDigits(digits)
  }
  if (digits.length % 3 === 0) {
    return tripleDigits(digits)
  }
  return `${digits.slice(0, 3)} ${pairDigits(digits.slice(3))}`
}

/**
 * Turns a phone number typed in national format into its international form.
 * @param phone - Number as typed, separators and leading zero allowed
 * @param countryCode - Country picked next to the phone field
 * @returns Number prefixed with the country dial code, without separators
 */
export const toInternationalPhone = (phone: string, countryCode: CountryCode): string => {
  const compact: string = phone.replace(/[\s.()-]/g, '')
  if (compact.startsWith('+')) {
    return compact
  }
  if (compact.startsWith('00')) {
    return `+${compact.slice(2)}`
  }
  const national: string = countryCode === 'FR' ? compact.replace(/^0/, '') : compact
  return `${COUNTRY_DIAL_CODES[countryCode]}${national}`
}

/**
 * Tells whether an international phone number is a valid French or Luxembourgish number.
 * @param phone - Number in international form
 * @returns True when the number matches one of the two formats
 */
export const isValidPhone = (phone: string): boolean =>
  FRENCH_PHONE_PATTERN.test(phone) || LUXEMBOURG_PHONE_PATTERN.test(phone)

/**
 * Builds a `tel:` link target from a phone number, keeping only digits and the leading plus sign.
 * @param phone - Phone number as stored, possibly with spaces
 * @returns Value for the `href` of a call link
 */
export const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`

/**
 * Splits a French or Luxembourgish number into groups of digits so it reads and is spoken group
 * by group: `+33612345678` into `+33 6 12 34 56 78`, `0612345678` into `06 12 34 56 78`,
 * `+35226123456` into `+352 26 12 34 56`, `+352621123456` into `+352 621 123 456` and
 * `+3521234567` into `+352 123 45 67`.
 * @param phone - Phone number as stored, possibly with separators
 * @returns Number with grouped digits, or the input unchanged when the format is not recognised
 */
export const groupPhoneDigits = (phone: string): string => {
  const compact: string = phone.replace(/[\s.()-]/g, '')
  if (FRENCH_PHONE_PATTERN.test(compact)) {
    return `+33 ${compact.charAt(3)} ${pairDigits(compact.slice(4))}`
  }
  if (FRENCH_NATIONAL_PHONE_PATTERN.test(compact)) {
    return pairDigits(compact)
  }
  if (LUXEMBOURG_PHONE_PATTERN.test(compact)) {
    return `+352 ${groupLuxembourgDigits(compact.slice(4))}`
  }
  return phone
}
