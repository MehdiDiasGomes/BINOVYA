import type { AccountBookingStatus, AccountPhotoKind } from '@/types/account'

export const LOGIN_LINK_LIFETIME_HOURS = 24

export const CUSTOMER_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export const SIGN_IN_METHODS: string[] = ['otp', 'magiclink']

export const SESSION_EXPIRED_QUERY = 'expired'

export const SIGN_OUT_TIMEOUT_MS = 3000

export const ACCOUNT_PHOTO_URL_LIFETIME_SECONDS = 10 * 60

export const ACCOUNT_BOOKING_STATUSES: AccountBookingStatus[] = ['paid', 'completed', 'cancelled']

export const ACCOUNT_PHOTO_KINDS: AccountPhotoKind[] = ['before', 'after']

export const ACCOUNT_STATUS_ICONS: Record<
  AccountBookingStatus,
  'CalendarCheck' | 'CircleCheck' | 'CircleX'
> = {
  paid: 'CalendarCheck',
  completed: 'CircleCheck',
  cancelled: 'CircleX',
}
