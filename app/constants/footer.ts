import type { NavItem } from '@/constants/navbar'

export const FOOTER_INFO_LINKS: readonly NavItem[] = [
  { labelKey: 'footer.info.booking', path: '/booking' },
  { labelKey: 'footer.info.quote', path: '/quote' },
  { labelKey: 'footer.info.contact', path: '/contact' },
  { labelKey: 'footer.info.legal', path: '/legal' },
  { labelKey: 'footer.info.privacy', path: '/privacy' },
]

export const FOOTER_LINK_CLASS: string =
  'flex min-h-11 items-center rounded-md transition-colors duration-press ease-brand hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 motion-reduce:transition-none lg:min-h-8'
