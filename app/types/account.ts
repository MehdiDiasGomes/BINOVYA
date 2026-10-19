import type { BookingLocale, BookingPlan } from '@/types/booking'
import type { MediaCardTone } from '@/types/mediaCard'
import type { ComputedRef } from 'vue'

export type AccountBookingStatus = 'paid' | 'completed' | 'cancelled'

export type AccountPhotoKind = 'before' | 'after'

export type AccountTranslate = (key: string, named: Record<string, unknown>) => string

export type AccountStatusIcon = 'CalendarDays' | 'CircleCheck' | 'CircleX'

export type AccountNavIcon = 'CircleUser' | 'LayoutDashboard'

export type AccountBookingCardView = {
  tone: MediaCardTone
  icon: AccountStatusIcon
  statusKey: string
  amountKey: string
  showReminder: boolean
  showRebook: boolean
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
}

export type AccountBookingRecord = {
  booking: AccountBooking
  paymentIntentId: string | null
}

export type AccountBookingPhotos = Record<AccountPhotoKind, string | null>

export type AccountBookingDocuments = {
  photos: AccountBookingPhotos
  receiptUrl: string | null
}

export type AccountLinksRefresh = 'ok' | 'failed' | 'expired'

export type AccountBookingDetail = {
  booking: AccountBooking
  documents: AccountBookingDocuments
}

export type AccountDetailRow = {
  labelKey: string
  value: string
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

export type LoginEndpoint = '/api/auth/login' | '/api/pro/auth/login'

export type LoginLinkRpc = 'claim_login_link' | 'claim_admin_login_link'

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

export type CustomerSessionStatus = 'none' | 'active' | 'expired' | 'admin'

export type CustomerSessionState = {
  status: ComputedRef<CustomerSessionStatus>
  isActive: ComputedRef<boolean>
  endSession: () => Promise<void>
  expireSession: () => Promise<void>
}
