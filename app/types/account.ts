import type { BookingLocale, BookingPlan } from '@/types/booking'
import type { ComputedRef } from 'vue'

export type AccountBookingStatus = 'paid' | 'completed' | 'cancelled'

export type AccountPhotoKind = 'before' | 'after'

export type AccountPhoto = {
  kind: AccountPhotoKind
  url: string
}

export type AccountBooking = {
  id: string
  scheduledDate: string
  address: string
  plan: BookingPlan
  smallBinCount: number
  largeBinCount: number
  amountTotalCents: number
  status: AccountBookingStatus
  photos: AccountPhoto[]
}

export type AccountOverview = {
  firstName: string
  deletionRequestedAt: string | null
  bookings: AccountBooking[]
}

export type LoginRequest = {
  email: string
  locale: BookingLocale
  website: string
}

export type LoginResponse = {
  success: boolean
}

export type DeletionRequestResponse = {
  requestedAt: string
}

export type LoginLinkTarget = {
  customerId: string
  locale: BookingLocale
}

export type LoginLink = {
  url: string
  email: string
  firstName: string
}

export type LoginEmailData = {
  firstName: string
  loginUrl: string
}

export type DeletionAlertData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  requestedAt: string
}

export type DeletionStep = 'idle' | 'confirming' | 'submitting' | 'done'

export type CustomerSessionStatus = 'none' | 'active' | 'expired'

export type CustomerSessionState = {
  status: ComputedRef<CustomerSessionStatus>
  isActive: ComputedRef<boolean>
  endSession: () => Promise<void>
  expireSession: () => Promise<void>
}
