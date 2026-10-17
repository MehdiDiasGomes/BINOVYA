import type { CountryCode } from '@/types/booking'

import { COUNTRY_DIAL_CODES } from '@/constants/booking'

const FRENCH_PHONE_PATTERN = /^\+33[1-9]\d{8}$/
const LUXEMBOURG_PHONE_PATTERN = /^\+352\d{6,9}$/

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
