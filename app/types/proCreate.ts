import type { BookingAddress, BookingContact, BookingPlan, CollectionAnswer } from '@/types/booking'
import type { ProRescheduleForceableCode } from '@/types/proAvailability'

export type ProBookingMode = 'payment_link' | 'offline'

export type ProPaymentMethod = 'stripe' | 'offline'

export type ProPriceSource = 'grid' | 'quote'

export type ProCreateForceableCode = ProRescheduleForceableCode

export type ProCreateErrorCode =
  | ProCreateForceableCode
  | 'invalidInput'
  | 'invalidAddress'
  | 'invalidQuantities'
  | 'invalidQuoteAmount'
  | 'quoteRequired'
  | 'customerNotFound'
  | 'customerPending'
  | 'pastDate'
  | 'tooFar'
  | 'paymentLinkFailed'

export type ProCreateContact = Omit<BookingContact, 'phoneCountryCode'>

export type ProCreateRequest = {
  requestId: string
  contact: ProCreateContact
  address: BookingAddress
  plan: BookingPlan
  smallBinCount: number
  largeBinCount: number
  householdCollectionWeekdays: number[]
  recyclingCollectionWeekdays: number[]
  date: string
  mode: ProBookingMode
  quoteAmountCents: number | null
  note: string | null
  force: boolean
}

export type ProCreateResponse = {
  bookingId: string
  mode: ProBookingMode
  scheduledDate: string
  amountTotalCents: number
  paymentDueAt: string | null
  overriddenCodes: ProCreateForceableCode[]
  isEmailSent: boolean
  isReplay: boolean
}

export type ProCreatePrefill = {
  contact: ProCreateContact
  address: BookingAddress
  plan: BookingPlan
  smallBinCount: number
  largeBinCount: number
  householdCollectionWeekdays: number[]
  recyclingCollectionWeekdays: number[]
  quoteAmountCents: number | null
  note: string | null
}

export type ProPaymentLinkErrorCode =
  | 'notFound'
  | 'notPending'
  | 'linkExpired'
  | 'noLink'
  | 'tooFrequent'
  | 'linkUnavailable'
  | 'emailFailed'

export type ProPaymentLinkResponse = {
  bookingId: string
}

export type ProCreateDraft = {
  requestId: string
  contact: BookingContact
  address: BookingAddress | null
  plan: BookingPlan
  smallBinCount: number
  largeBinCount: number
  household: CollectionAnswer
  recycling: CollectionAnswer
  date: string
  mode: ProBookingMode
  priceSource: ProPriceSource
  quoteAmount: string
  note: string
}

export type ProCreateField =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'address'
  | 'quoteAmount'
  | 'bins'
  | 'date'
  | 'note'

export type ProCreateErrors = Partial<Record<ProCreateField, string>>

export type ProCreateSection = 'customer' | 'address' | 'bins' | 'date' | 'payment'

export type ProRadioOption = {
  value: string
  label: string
  hint: string
}
