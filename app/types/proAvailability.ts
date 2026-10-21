import type { BookingAddress, GeoPoint } from '@/types/booking'
import type { ProIntervention } from '@/types/pro'
import type { Ref } from 'vue'

export type ProCapacitySource = 'rule' | 'override'

export type ProWeekdayRule = {
  weekday: number
  maxBookings: number
}

export type ProDayOverview = {
  date: string
  weekday: number
  capacity: number
  capacitySource: ProCapacitySource
  isClosed: boolean
  sector: GeoPoint | null
  sectorLabel: string | null
  note: string | null
  activeCount: number
  paidCount: number
}

export type ProAvailability = {
  from: string
  to: string
  rules: ProWeekdayRule[]
  days: ProDayOverview[]
}

export type ProWeekdayRulesRequest = {
  rules: ProWeekdayRule[]
}

export type ProDayOverrideRequest = {
  maxBookings: number | null
  note: string | null
  sector?: BookingAddress | null
}

export type ProRescheduleForceableCode = 'outOfArea' | 'dayClosed' | 'dayFull' | 'outOfSector'

export type ProRescheduleErrorCode =
  | ProRescheduleForceableCode
  | 'notFound'
  | 'notPaid'
  | 'invalidDate'
  | 'sameDate'
  | 'pastDate'
  | 'tooFar'
  | 'tooFrequent'

export type ProRescheduleRequest = {
  date: string
  force: boolean
}

export type ProRescheduleResponse = {
  bookingId: string
  oldDate: string
  newDate: string
  overriddenCodes: ProRescheduleForceableCode[]
}

export type ProRescheduledEvent = ProRescheduleResponse & {
  intervention: ProIntervention
}

export type ProDayStatusKind = 'closedWithBookings' | 'closed' | 'overCapacity'

export type ProDayStatusTone = 'warning' | 'info'

export type ProDayAlertTone = ProDayStatusTone | 'urgent'

export type ProDayStatus = {
  kind: ProDayStatusKind
  tone: ProDayStatusTone
  count: number
}

export type ProPluralTranslate = (
  key: string,
  named: Record<string, unknown>,
  plural: number,
) => string

export type ProDayOverrideDraftsSource = {
  date: () => string
  day: () => ProDayOverview | null
}

export type ProDayOverrideDrafts = {
  capacityDraft: Ref<number | null>
  noteDraft: Ref<string>
  sectorAddress: Ref<BookingAddress | null>
  isStoredSectorRemoved: Ref<boolean>
  capacityError: Ref<string>
  sectorError: Ref<string>
  feedback: Ref<string>
  resetAfterRefresh: (date: string, savedDay: ProDayOverview | null) => void
}
