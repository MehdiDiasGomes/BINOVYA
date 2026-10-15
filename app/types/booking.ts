import type { Ref } from 'vue'

export type ServiceSlug = 'small-bin' | 'large-bin'

export type BookingPlan = 'one_off' | 'quarterly' | 'annual'

export type BookingLocale = 'fr' | 'en'

export type BookingStepId = 'contact' | 'bins' | 'schedule' | 'payment'

export type CollectionKind = 'household' | 'recycling'

export type DayStatus = 'available' | 'full' | 'closed' | 'outOfSector'

export type GeoPoint = {
  latitude: number
  longitude: number
}

export type BookingService = {
  slug: ServiceSlug
  titleKey: string
  capacityKey: string
  image: string
}

export type CountryCode = 'FR' | 'LU'

export type BookingAddress = GeoPoint & {
  label: string
  city: string
  postcode: string
  countryCode: CountryCode
}

export type AddressSearchResponse = {
  suggestions: BookingAddress[]
}

export type BookingContact = {
  firstName: string
  lastName: string
  email: string
  phone: string
  phoneCountryCode: CountryCode
}

export type BookingQuantities = Record<ServiceSlug, number>

export type CollectionAnswer = {
  weekdays: number[]
  isUnknown: boolean
}

export type BookingDraft = {
  address: BookingAddress | null
  quantities: BookingQuantities
  plan: BookingPlan
  collection: Record<CollectionKind, CollectionAnswer>
  date: string | null
  contact: BookingContact
  hasConfirmedBinsReady: boolean
  hasAcceptedTerms: boolean
}

export type PriceGridEntry = {
  plan: BookingPlan
  smallBinCount: number
  largeBinCount: number
  priceCents: number
}

export type DayStatusEntry = {
  date: string
  status: DayStatus
}

export type DayAvailability = DayStatusEntry & {
  isRecommended: boolean
}

export type AvailabilityResponse = {
  isInServiceArea: boolean
  serviceAreaRadiusKm: number
  days: DayStatusEntry[]
}

export type AvailabilityState = 'idle' | 'loading' | 'ready' | 'error'

export type BookingRequest = {
  address: BookingAddress
  plan: BookingPlan
  smallBinCount: number
  largeBinCount: number
  householdCollectionWeekdays: number[]
  recyclingCollectionWeekdays: number[]
  binsReadyConfirmed: boolean
  date: string
  contact: BookingContact
  locale: BookingLocale
  website: string
}

export type BookingResponse = {
  bookingId: string
  amountTotalCents: number
  checkoutUrl: string
}

export type BookingErrorCode =
  | 'dayTaken'
  | 'pendingPayment'
  | 'outOfArea'
  | 'quoteRequired'
  | 'binsNotConfirmed'

export type BookingReleaseResponse = {
  isReleased: boolean
}

export type CheckoutOutcome = 'success' | 'cancelled'

export type StoredCheckout = {
  bookingId: string
  draft: BookingDraft
}

export type ContactErrors = Partial<Record<keyof BookingContact, string>>

export type BookingCheckoutState = {
  rememberCheckout: (bookingId: string, draft: BookingDraft) => boolean
  takeCheckout: () => StoredCheckout | null
  readOutcome: () => CheckoutOutcome | null
  releaseBooking: (bookingId: string) => Promise<void>
  waitForRelease: () => Promise<void>
  readErrorCode: (error: unknown) => BookingErrorCode | null
}

export type CheckoutReturnOptions = {
  checkout: BookingCheckoutState
  isSubmitting: Ref<boolean>
  isConfirmed: Ref<boolean>
  submitErrorKey: Ref<string | null>
  showStep: (step: BookingStepId) => Promise<void>
}
