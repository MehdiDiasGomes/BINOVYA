import type { AccountBookingStatus, AccountPhotoKind, AccountStatusIcon } from '@/types/account'
import type { MediaCardTone } from '@/types/mediaCard'

export const LOGIN_LINK_LIFETIME_HOURS = 24

export const CUSTOMER_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export const SIGN_IN_METHODS: string[] = ['otp', 'magiclink']

export const SESSION_EXPIRED_QUERY = 'expired'

export const SIGN_OUT_TIMEOUT_MS = 3000

export const ACCOUNT_BOOKING_STATUSES: AccountBookingStatus[] = ['paid', 'completed', 'cancelled']

export const ACCOUNT_PHOTO_KINDS: AccountPhotoKind[] = ['before', 'after']

export const ACCOUNT_STATUS_ICONS: Record<AccountBookingStatus, AccountStatusIcon> = {
  paid: 'CalendarDays',
  completed: 'CircleCheck',
  cancelled: 'CircleX',
}

export const ACCOUNT_STATUS_TONES: Record<AccountBookingStatus, MediaCardTone> = {
  paid: 'info',
  completed: 'success',
  cancelled: 'neutral',
}

export const ACCOUNT_SKELETON_CARD_COUNT: number = 4

export const ACCOUNT_SKELETON_MOBILE_CARD_COUNT: number = 2
