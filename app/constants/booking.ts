import type { BookingService, BookingStepId } from '@/types/booking'

export const BOOKING_SERVICES: BookingService[] = [
  {
    slug: 'small-bin',
    titleKey: 'offers.small.title',
    descriptionKey: 'offers.small.desc',
    image: '/images/offers/petit-format.png',
    firstUnitPriceCents: 1990,
    additionalUnitPriceCents: 990,
  },
  {
    slug: 'large-bin',
    titleKey: 'offers.large.title',
    descriptionKey: 'offers.large.desc',
    image: '/images/offers/grand-format.png',
    firstUnitPriceCents: 3990,
    additionalUnitPriceCents: 2990,
  },
]

export const BOOKING_STEPS: BookingStepId[] = ['address', 'services', 'date', 'contact']

export const MAX_QUANTITY_PER_SERVICE = 10

export const WEEKDAYS_MONDAY_FIRST: number[] = [1, 2, 3, 4, 5, 6, 0]

export const GEOCODING_ENDPOINT = 'https://data.geopf.fr/geocodage/search'

/**
 * While false, a booking holds its slot but cannot be paid, so it expires without being confirmed.
 */
export const IS_ONLINE_PAYMENT_ENABLED = false
