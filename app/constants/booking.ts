import { FR, LU } from 'country-flag-icons/string/3x2'

import type {
  BookingPlan,
  BookingService,
  BookingStepId,
  CollectionKind,
  CountryCode,
} from '@/types/booking'

import { toSvgDataUri } from '@/utils/svg'

export const COUNTRY_CODES: CountryCode[] = ['FR', 'LU']

export const COUNTRY_DIAL_CODES: Record<CountryCode, string> = { FR: '+33', LU: '+352' }

export const COUNTRY_FLAG_SOURCES: Record<CountryCode, string> = {
  FR: toSvgDataUri(FR),
  LU: toSvgDataUri(LU),
}

export const INPUT_GROUP_FRAME_CLASS =
  'col-span-2 col-start-1 row-start-2 rounded-lg border border-ink/25 bg-white transition-shadow group-has-[:focus-visible]:border-primary group-has-[:focus-visible]:ring-[3px] group-has-[:focus-visible]:ring-primary/30 group-has-[[aria-invalid=true]]:border-destructive'

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

/**
 * While false, a booking holds its slot but cannot be paid, so it expires without being confirmed.
 */
export const IS_ONLINE_PAYMENT_ENABLED = false
