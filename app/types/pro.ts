import type { LucideIconName } from '@/constants/clients'
import type { AccountBookingStatus, AccountPhotoKind } from '@/types/account'
import type { BookingPlan, GeoPoint } from '@/types/booking'
import type { MediaCardTone } from '@/types/mediaCard'
import type { ProDayOverview } from '@/types/proAvailability'
import type { ProPaymentMethod, ProPriceSource } from '@/types/proCreate'
import type { ComputedRef } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export type ProBookingStatus = AccountBookingStatus | 'pending_payment' | 'expired'

export type ProStatusFilter = 'all' | ProBookingStatus

export type ProPhotoKind = AccountPhotoKind

export type ProInterventionPhotos = Record<ProPhotoKind, boolean>

export type ProCustomer = {
  firstName: string
  lastName: string
  phone: string
}

export type ProIntervention = {
  id: string
  scheduledDate: string
  customer: ProCustomer | null
  address: string
  latitude: number
  longitude: number
  plan: BookingPlan
  smallBinCount: number
  largeBinCount: number
  householdCollectionWeekdays: number[]
  recyclingCollectionWeekdays: number[]
  amountTotalCents: number
  status: ProBookingStatus
  isToMove: boolean
  photos: ProInterventionPhotos
  completedWithoutPhotos: boolean
  paymentMethod: ProPaymentMethod
  createdByAdmin: boolean
  paymentDueAt: string | null
  priceSource: ProPriceSource
  adminNote: string | null
}

export type ProRejection<Code extends string> = {
  statusCode: number
  statusMessage: string
  code: Code
}

export type ProPlanning = {
  date: string
  depot: GeoPoint | null
  interventions: ProIntervention[]
  day: ProDayOverview | null
}

export type ProInterventionsPage = {
  interventions: ProIntervention[]
  total: number
  page: number
  pageSize: number
}

export type ProInterventionsFilters = {
  statuses: ProBookingStatus[]
  from: string | null
  to: string | null
}

export type ProInterventionsQuery = {
  status: ProStatusFilter
  from?: string
  to?: string
  page: number
}

export type ProInterventionView = {
  tone: MediaCardTone
  paymentKey: string
  hasPaymentNote: boolean
}

export type MapsStop = GeoPoint & {
  address: string
}

export type AdminLoginLink = {
  url: string
  email: string
}

export type AdminLoginEmailData = {
  loginUrl: string
}

export type AdminSessionState = {
  isAdmin: ComputedRef<boolean>
  isExpiredAdmin: ComputedRef<boolean>
  hasSession: ComputedRef<boolean>
  email: ComputedRef<string>
  expiredLoginRoute: ComputedRef<RouteLocationRaw>
  endSession: () => Promise<void>
  leave: () => Promise<void>
  expire: () => Promise<void>
}

export type ProNavItem = {
  path: string
  labelKey: string
  icon: LucideIconName
}

export type ProFiltersDraft = {
  status: ProStatusFilter
  from: string
  to: string
}

export type ProNavigationOptions = {
  replace?: boolean
}

export type ProInterventionsFiltersState = {
  draft: ProFiltersDraft
  query: ComputedRef<ProInterventionsQuery>
  currentPage: ComputedRef<number>
  rangeError: ComputedRef<string>
  resetFilters: () => Promise<void>
  goToPage: (page: number, options?: ProNavigationOptions) => Promise<void>
}
