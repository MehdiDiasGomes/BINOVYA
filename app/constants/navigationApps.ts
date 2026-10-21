import type { NavigationAppId, NavigationPlatform } from '@/types/navigationApps'

export const GOOGLE_MAPS_DIRECTIONS_URL: string = 'https://www.google.com/maps/dir/'

export const WAZE_DEEP_LINK_URL: string = 'https://www.waze.com/ul'

export const APPLE_MAPS_URL: string = 'https://maps.apple.com/'

export const GEO_URI_ORIGIN: string = 'geo:0,0'

export const NAVIGATION_APPS: Record<NavigationPlatform, NavigationAppId[]> = {
  ios: ['appleMaps', 'googleMaps', 'waze'],
  android: ['googleMaps', 'waze', 'other'],
  mac: ['googleMaps', 'waze', 'appleMaps'],
  other: ['googleMaps', 'waze'],
}
