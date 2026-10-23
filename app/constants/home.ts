import type { HomeOffer, HomeService } from '@/types/home'

export const HOME_SECTION_CONTAINER_CLASS: string = 'mx-auto max-w-6xl px-6'

export const HOME_EYEBROW_CLASS: string = 'mb-2 text-xs font-bold uppercase tracking-[1.5px]'

export const HOME_SECTION_TITLE_CLASS: string = 'text-3xl font-extrabold sm:text-4xl'

export const HOME_HIGHLIGHT_KEYS: string[] = ['steam', 'natural', 'payment']

export const HOME_STEP_KEYS: string[] = ['book', 'prepare', 'clean']

export const HOME_SERVICES: HomeService[] = [
  { key: 'bins', image: '/images/services/bins.png' },
  { key: 'pav', image: '/images/services/pav.png' },
  { key: 'urban', image: '/images/services/urban.png' },
  { key: 'signage', image: '/images/services/signage.png' },
]

export const HOME_OFFERS: HomeOffer[] = [
  { key: 'small', slug: 'small-bin', isHighlighted: false },
  { key: 'large', slug: 'large-bin', isHighlighted: true },
]

export const HOME_OFFER_INCLUDED_KEYS: string[] = ['steam', 'disinfection', 'natural']

export const HOME_FAQ_KEYS: string[] = ['day', 'area', 'collectionDay', 'pros', 'photos']

export const HOME_BEFORE_IMAGE_SRC: string = '/images/before-after/bins-before.jpg'

export const HOME_AFTER_IMAGE_SRC: string = '/images/before-after/bins-after.jpg'

export const HOME_BEFORE_AFTER_WIDTH: number = 686

export const HOME_BEFORE_AFTER_HEIGHT: number = 330

export const HOME_OFFERS_HEADING_ID: string = 'home-offers-title'

export const HOME_FAQ_HEADING_ID: string = 'home-faq-title'
