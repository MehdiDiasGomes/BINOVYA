import { FR, LU } from 'country-flag-icons/string/3x2'

import type {
  BookingErrorCode,
  BookingPlan,
  BookingService,
  BookingStepId,
  CollectionKind,
  CountryCode,
} from '@/types/booking'

import { toSvgDataUri } from '@/utils/svg'

export const BUSINESS_TIME_ZONE: string = 'Europe/Paris'

export const COUNTRY_CODES: CountryCode[] = ['FR', 'LU']

export const BOOKING_ADDRESS_INPUT_ID: string = 'booking-address'

export const BOOKING_CHECKOUT_STORAGE_KEY: string = 'binovya-booking-checkout'

export const COUNTRY_DIAL_CODES: Record<CountryCode, string> = { FR: '+33', LU: '+352' }

export const COUNTRY_FLAG_SOURCES: Record<CountryCode, string> = {
  FR: toSvgDataUri(FR),
  LU: toSvgDataUri(LU),
}

export const INPUT_GROUP_FRAME_CLASS =
  'col-span-2 col-start-1 row-start-2 rounded-lg border border-ink/50 bg-white transition-shadow group-has-[:focus-visible]:border-primary group-has-[:focus-visible]:ring-[3px] group-has-[:focus-visible]:ring-primary/60 group-has-[[aria-invalid=true]]:border-destructive'

export const FIELD_INPUT_CLASS: string =
  'h-12 w-full rounded-lg border border-ink/50 bg-white px-4 text-[15px] text-ink outline-none transition-[border-color,box-shadow] duration-press ease-brand placeholder:text-ink/60 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/60 aria-invalid:border-destructive motion-reduce:transition-none'

export const FIELD_TEXTAREA_CLASS: string =
  'block w-full resize-none rounded-lg border border-ink/50 bg-white px-4 py-3 text-[15px] text-ink outline-none transition-[border-color,box-shadow] duration-press ease-brand placeholder:text-ink/60 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/60 motion-reduce:transition-none'

export const CALENDAR_NAV_BUTTON_CLASS: string =
  'pointer-events-auto flex size-11 items-center justify-center rounded-lg border border-ink/50 bg-white text-ink opacity-100 shadow-none transition-[color,background-color,border-color,scale] duration-press ease-brand hover:border-primary hover:bg-paper-2 hover:text-ink hover:opacity-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 has-[>svg]:px-0 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 motion-safe:not-data-[disabled]:active:scale-95 motion-reduce:transition-none'

export const CALENDAR_CELL_CLASS: string =
  'relative flex h-11 w-full cursor-pointer items-center justify-center rounded-lg text-sm font-bold text-ink transition-[color,background-color,scale] duration-press ease-brand hover:bg-paper-2 hover:text-ink focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white data-[outside-view]:invisible data-[today]:not-data-[selected]:bg-paper-2 data-[today]:not-data-[selected]:font-black data-[today]:not-data-[selected]:underline data-[today]:not-data-[selected]:decoration-2 data-[today]:not-data-[selected]:underline-offset-4 data-[disabled]:cursor-not-allowed data-[disabled]:font-medium data-[disabled]:text-ink/35 data-[disabled]:opacity-100 data-[disabled]:line-through data-[disabled]:hover:bg-transparent data-[unavailable]:cursor-not-allowed data-[unavailable]:font-medium data-[unavailable]:text-ink/35 data-[unavailable]:opacity-100 data-[unavailable]:line-through data-[unavailable]:hover:bg-transparent data-[selected]:bg-primary data-[selected]:font-black data-[selected]:text-white data-[selected]:hover:bg-primary data-[selected]:hover:text-white motion-safe:not-data-[disabled]:not-data-[unavailable]:active:scale-95 motion-reduce:transition-none'

export const CALENDAR_CELL_WRAPPER_CLASS: string =
  'flex-1 px-0 py-0.5 [&:has([data-selected])]:bg-transparent'

export const CALENDAR_RECOMMENDED_CLASS: string =
  'bg-turquoise/15 ring-1 ring-inset ring-turquoise-deep data-[selected]:ring-0'

export const CALENDAR_HEAD_CELL_CLASS: string =
  'flex-1 pb-2 text-center text-xs font-bold uppercase text-ink/70'

export const CALENDAR_HEADING_CLASS: string =
  'font-heading text-base font-black capitalize text-ink'

export const SELECT_ITEM_CLASS: string =
  'min-h-11 cursor-pointer text-sm font-semibold text-ink transition-colors duration-press ease-brand focus:bg-paper-2 focus:text-ink data-[state=checked]:font-black motion-reduce:transition-none'

export const FLOATING_PANEL_CLASS: string =
  'rounded-xl border-border bg-white text-ink shadow-lg motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none'

export const FIELD_HINT_CLASS: string = 'mt-1.5 block text-[13px] text-ink/70'

export const FIELD_ERROR_CLASS: string =
  'mt-1.5 flex items-center gap-1.5 text-[13px] font-bold text-destructive'

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

export const CONTACT_NAME_MIN_LENGTH = 2

export const CONTACT_NAME_MAX_LENGTH = 80

export const CONTACT_NAME_LIMITS: Record<'min' | 'max', number> = {
  min: CONTACT_NAME_MIN_LENGTH,
  max: CONTACT_NAME_MAX_LENGTH,
}

export const COMPANY_MAX_LENGTH = 120

export const HONEYPOT_MAX_LENGTH = 200

export const EMAIL_MAX_LENGTH = 254

export const BOOKING_SUBMIT_ERROR_KEYS: Record<BookingErrorCode, string> = {
  dayTaken: 'booking.errors.dayTaken',
  pendingPayment: 'booking.errors.pendingPayment',
  outOfArea: 'booking.errors.outOfArea',
  quoteRequired: 'booking.errors.quoteRequired',
  binsNotConfirmed: 'booking.errors.binsReady',
  invalidAddress: 'booking.errors.invalidAddress',
}
