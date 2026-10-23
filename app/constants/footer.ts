import type { FooterColumn } from '@/types/footer'

import { HOME_FAQ_HEADING_ID, HOME_OFFERS_HEADING_ID } from '@/constants/home'
import { SERVICES_HEADING_ID } from '@/constants/navbar'

export const FOOTER_COMMITMENT_KEYS: readonly string[] = [
  'footer.commitments.eco',
  'footer.commitments.steam',
  'footer.commitments.quality',
]

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    id: 'services',
    titleKey: 'footer.services.title',
    links: [
      { kind: 'page', labelKey: 'footer.links.booking', path: '/booking' },
      { kind: 'page', labelKey: 'footer.links.quote', path: '/quote' },
      {
        kind: 'page',
        labelKey: 'nav.services',
        path: '/',
        hash: '#services',
        focusId: SERVICES_HEADING_ID,
      },
      {
        kind: 'page',
        labelKey: 'footer.links.pricing',
        path: '/',
        hash: '#tarifs',
        focusId: HOME_OFFERS_HEADING_ID,
      },
      {
        kind: 'page',
        labelKey: 'home.faq.eyebrow',
        path: '/',
        hash: '#faq',
        focusId: HOME_FAQ_HEADING_ID,
      },
    ],
  },
  {
    id: 'contact',
    titleKey: 'footer.contact.title',
    links: [
      { kind: 'email' },
      { kind: 'page', labelKey: 'footer.links.contactForm', path: '/contact' },
      { kind: 'account' },
    ],
  },
  {
    id: 'legal',
    titleKey: 'footer.legal.title',
    links: [
      { kind: 'page', labelKey: 'footer.links.legal', path: '/legal' },
      { kind: 'page', labelKey: 'footer.links.privacy', path: '/privacy' },
    ],
  },
]

export const FOOTER_HEADING_CLASS: string =
  'mb-4 text-sm font-black uppercase tracking-wider text-white'

export const FOOTER_LIST_CLASS: string = 'text-[13px] text-muted-foreground'

export const FOOTER_LINK_CLASS: string =
  '-mx-1 flex min-h-11 items-center gap-2 rounded-md px-1 transition-colors duration-press ease-brand hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 motion-reduce:transition-none lg:min-h-8'
