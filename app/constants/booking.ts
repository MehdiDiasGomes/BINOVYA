import type { BookingPlan, BookingService, BookingStepId, CollectionKind } from '@/types/booking'

export const BOOKING_SERVICES: BookingService[] = [
  {
    slug: 'small-bin',
    titleKey: 'booking.bins.small.title',
    capacityKey: 'booking.bins.small.capacity',
    image: '/images/offers/petit-format.png',
  },
  {
    slug: 'large-bin',
    titleKey: 'booking.bins.large.title',
    capacityKey: 'booking.bins.large.capacity',
    image: '/images/offers/grand-format.png',
  },
]

export const BOOKING_STEPS: BookingStepId[] = ['contact', 'bins', 'schedule', 'payment']

export const BOOKING_PLANS: BookingPlan[] = ['one_off', 'quarterly', 'annual']

export const COLLECTION_KINDS: CollectionKind[] = ['household', 'recycling']

export const COLLECTION_LID_CLASSES: Record<CollectionKind, string[]> = {
  household: ['fill-green-700', 'fill-zinc-400'],
  recycling: ['fill-yellow-400'],
}

export const MAX_QUANTITY_PER_SERVICE = 10

export const WEEKDAYS_MONDAY_FIRST: number[] = [1, 2, 3, 4, 5, 6, 0]

export const GEOCODING_ENDPOINT = 'https://data.geopf.fr/geocodage/search'

/**
 * While false, a booking holds its slot but cannot be paid, so it expires without being confirmed.
 */
export const IS_ONLINE_PAYMENT_ENABLED = false
