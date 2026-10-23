import type { ServiceSlug } from '@/types/booking'

export type BeforeAfterImage = {
  src: string
  alt: string
}

export type HomeServiceKey = 'bins' | 'pav' | 'urban' | 'signage'

export type HomeService = {
  key: HomeServiceKey
  image: string
}

export type HomeOfferKey = 'small' | 'large'

export type HomeOffer = {
  key: HomeOfferKey
  slug: ServiceSlug
  isHighlighted: boolean
}
