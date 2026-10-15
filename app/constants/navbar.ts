export type NavItem = {
  labelKey: string
  path: string
  hash?: string
}

export const navigationItems: NavItem[] = [
  { labelKey: 'nav.services', path: '/', hash: '#services' },
  { labelKey: 'nav.quote', path: '/quote' },
  { labelKey: 'nav.contact', path: '/contact' },
]
