import type { BookingAddress, BookingContact, BookingPlan, CollectionAnswer } from '@/types/booking'
import type { ProRescheduleForceableCode } from '@/types/proAvailability'

export type ProBookingMode = 'payment_link' | 'offline'

export type ProPaymentMethod = 'stripe' | 'offline'

export type ProCreateForceableCode = ProRescheduleForceableCode

export type ProCreateErrorCode =
  | ProCreateForceableCode
  | 'invalidInput'
  | 'invalidAddress'
  | 'invalidQuantities'
  | 'quoteRequired'
  | 'customerNotFound'
  | 'customerPending'
  | 'pastDate'
  | 'tooFar'
  | 'paymentLinkFailed'

export type ProCreateContact = Omit<BookingContact, 'phoneCountryCode'>

export type ProCreateRequest = {
  contact: ProCreateContact
  address: BookingAddress
  plan: BookingPlan
  smallBinCount: number
  largeBinCount: number
  householdCollectionWeekdays: number[]
  recyclingCollectionWeekdays: number[]
  date: string
  mode: ProBookingMode
  force: boolean
}

export type ProCreateResponse = {
  bookingId: string
  mode: ProBookingMode
  amountTotalCents: number
  paymentDueAt: string | null
  overriddenCodes: ProCreateForceableCode[]
  isEmailSent: boolean
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
  contact: BookingContact
  address: BookingAddress | null
  plan: BookingPlan
  smallBinCount: number
  largeBinCount: number
  household: CollectionAnswer
  recycling: CollectionAnswer
  date: string
  mode: ProBookingMode
}

export type ProCreateField =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'address'
  | 'bins'
  | 'date'

export type ProCreateErrors = Partial<Record<ProCreateField, string>>

export type ProCreateSection = 'customer' | 'address' | 'bins' | 'date' | 'payment'
