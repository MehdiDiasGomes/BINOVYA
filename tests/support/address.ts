import { readEnv } from './env'
import { signAddressToken } from '../../server/utils/addressToken'

import type { AddressDetails, BookingAddress } from '../../app/types/booking'

/**
 * Signs an address the way `/api/address/search` does, without calling any geocoder.
 * @param address - Address fields; any token already present is replaced
 * @param now - Signing time in milliseconds, in the past to build an expired token
 * @returns The address with a token valid for the server under test
 */
export const signedAddress = (
  address: AddressDetails | BookingAddress,
  now?: number,
): BookingAddress => {
  const fields: AddressDetails = {
    label: address.label,
    city: address.city,
    postcode: address.postcode,
    countryCode: address.countryCode,
    latitude: address.latitude,
    longitude: address.longitude,
  }
  return { ...fields, token: signAddressToken(fields, readEnv('NUXT_ADDRESS_TOKEN_SECRET'), now) }
}

export const THIONVILLE_ADDRESS: AddressDetails = {
  label: '12 rue de la Gare, 57100 Thionville',
  city: 'Thionville',
  postcode: '57100',
  countryCode: 'FR',
  latitude: 49.3595,
  longitude: 6.1685,
}

export const PARIS_ADDRESS: AddressDetails = {
  label: '1 rue de Rivoli, 75001 Paris',
  city: 'Paris',
  postcode: '75001',
  countryCode: 'FR',
  latitude: 48.8606,
  longitude: 2.3376,
}

export const UCKANGE_ADDRESS: AddressDetails = {
  label: 'Rue de la Gare, 57270 Uckange',
  city: 'Uckange',
  postcode: '57270',
  countryCode: 'FR',
  latitude: 49.3033,
  longitude: 6.1556,
}
