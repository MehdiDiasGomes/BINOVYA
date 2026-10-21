export type NavigationPlatform = 'ios' | 'android' | 'mac' | 'other'

export type NavigationAppId = 'appleMaps' | 'googleMaps' | 'waze' | 'other'

export type NavigationAppLink = {
  id: NavigationAppId
  href: string
  opensNewTab: boolean
}
