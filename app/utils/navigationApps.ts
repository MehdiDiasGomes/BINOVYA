import type { NavigationAppId, NavigationAppLink, NavigationPlatform } from '@/types/navigationApps'
import type { MapsStop } from '@/types/pro'

import {
  APPLE_MAPS_URL,
  GEO_URI_ORIGIN,
  NAVIGATION_APPS,
  WAZE_DEEP_LINK_URL,
} from '@/constants/navigationApps'
import { hasValidCoordinates, stopLocation } from '@/utils/geo'
import { directionsUrl } from '@/utils/googleMaps'

const IOS_DEVICE: RegExp = /iPhone|iPad|iPod/

const ANDROID_DEVICE: RegExp = /Android/i

const MAC_DEVICE: RegExp = /Macintosh|Mac OS X/

const encodeGeoText = (text: string): string =>
  encodeURIComponent(text).replace(/\(/g, '%28').replace(/\)/g, '%29')

/**
 * Builds a Waze deep link that starts navigation to the coordinates, or searches the address when
 * the coordinates are invalid. Opens the Waze app when installed, waze.com otherwise.
 * @param stop - Coordinates and address text of the destination
 * @returns Absolute Waze URL
 */
export const wazeUrl = (stop: MapsStop): string => {
  const params: URLSearchParams = hasValidCoordinates(stop)
    ? new URLSearchParams({ ll: stopLocation(stop), navigate: 'yes' })
    : new URLSearchParams({ q: stopLocation(stop) })
  return `${WAZE_DEEP_LINK_URL}?${params.toString()}`
}

/**
 * Builds an Apple Maps driving directions link from the current position, with the `daddr` and
 * `dirflg` parameters understood by every iOS and macOS version.
 * @param stop - Coordinates and address text of the destination
 * @returns Absolute Apple Maps URL
 */
export const appleMapsUrl = (stop: MapsStop): string =>
  `${APPLE_MAPS_URL}?${new URLSearchParams({ daddr: stopLocation(stop), dirflg: 'd' }).toString()}`

/**
 * Builds an Android `geo:` URI showing the destination with the address as label, so Android
 * offers every installed maps or navigation app.
 * @param stop - Coordinates and address text of the destination
 * @returns `geo:0,0?q=…` URI
 */
export const geoUri = (stop: MapsStop): string => {
  const address: string = encodeGeoText(stop.address.trim())
  const query: string = hasValidCoordinates(stop)
    ? `${stop.latitude},${stop.longitude}(${address})`
    : address
  return `${GEO_URI_ORIGIN}?q=${query}`
}

/**
 * Guesses the platform from the browser, to list the navigation apps it can open. iPadOS
 * presents itself as a Mac, a touch screen tells them apart.
 * @param userAgent - `navigator.userAgent`
 * @param maxTouchPoints - `navigator.maxTouchPoints`
 * @returns Platform of the device
 */
export const detectNavigationPlatform = (
  userAgent: string,
  maxTouchPoints: number,
): NavigationPlatform => {
  if (IOS_DEVICE.test(userAgent) || (MAC_DEVICE.test(userAgent) && maxTouchPoints > 1)) {
    return 'ios'
  }
  if (ANDROID_DEVICE.test(userAgent)) {
    return 'android'
  }
  return MAC_DEVICE.test(userAgent) ? 'mac' : 'other'
}

const NAVIGATION_URLS: Record<NavigationAppId, (stop: MapsStop) => string> = {
  appleMaps: appleMapsUrl,
  googleMaps: directionsUrl,
  waze: wazeUrl,
  other: geoUri,
}

/**
 * Lists the navigation apps offered on a platform, with their link to the destination. Every
 * link opens in a new tab except the `geo:` URI, which Android hands to an app.
 * @param platform - Platform of the device
 * @param stop - Coordinates and address text of the destination
 * @returns Links in display order
 */
export const navigationAppLinks = (
  platform: NavigationPlatform,
  stop: MapsStop,
): NavigationAppLink[] =>
  NAVIGATION_APPS[platform].map(
    (id: NavigationAppId): NavigationAppLink => ({
      id,
      href: NAVIGATION_URLS[id](stop),
      opensNewTab: id !== 'other',
    }),
  )
