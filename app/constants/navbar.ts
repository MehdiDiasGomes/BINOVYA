export type NavItem = {
  labelKey: string
  path: string
  hash?: string
}

export const navigationItems: NavItem[] = [
  { labelKey: 'nav.services', path: '/', hash: '#services' },
  { labelKey: 'nav.pro', path: '/professionals' },
  { labelKey: 'nav.contact', path: '/', hash: '#contact' },
]
