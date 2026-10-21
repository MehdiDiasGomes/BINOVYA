import type {
  AccountBookingStatus,
  AccountNavIcon,
  AccountStatusIcon,
  CustomerSessionStatus,
} from '@/types/account'
import type { MediaCardTone } from '@/types/mediaCard'

import { PRO_HOME_PATH } from '@/constants/pro'

export const LOGIN_LINK_LIFETIME_HOURS = 24

export const LINK_SESSION_MAX_AGE_DAYS: number = 7

export const CUSTOMER_SESSION_MAX_AGE_SECONDS: number = LINK_SESSION_MAX_AGE_DAYS * 24 * 60 * 60

export const ADMIN_SESSION_MAX_AGE_SECONDS: number = CUSTOMER_SESSION_MAX_AGE_SECONDS

export const FORBIDDEN_ORIGIN_CODE: string = 'forbiddenOrigin'

export const SIGN_IN_METHODS: string[] = ['otp', 'magiclink']

export const SESSION_EXPIRED_QUERY = 'expired'

export const SIGN_OUT_TIMEOUT_MS = 3000

export const PAGE_DATA_TIMEOUT_MS: number = 15000

export const ACCOUNT_BOOKING_STATUSES: AccountBookingStatus[] = ['paid', 'completed', 'cancelled']

/**
 * Lifetime of the signed URLs of the before and after photos, generated at each view of a booking
 * page: long enough to look at the photos and open them full size, short enough that a copied or
 * leaked URL stops working within minutes, while the session itself lasts 7 days.
 */
export const ACCOUNT_PHOTO_URL_LIFETIME_SECONDS: number = 10 * 60

export const ACCOUNT_PHOTO_URL_REFRESH_MARGIN_SECONDS: number = 60

export const PAYMENT_RECEIPT_TIMEOUT_MS: number = 4000

export const PAYMENT_RECEIPT_CACHE_TTL_MS: number = 5 * 60 * 1000

export const PAYMENT_RECEIPT_MISS_CACHE_TTL_MS: number = 30 * 1000

export const PAYMENT_RECEIPT_CACHE_MAX_ENTRIES: number = 500

export const STRIPE_RECEIPT_HOST_SUFFIX: string = '.stripe.com'

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

export const ACCOUNT_NAV_PATHS: Record<CustomerSessionStatus, string> = {
  none: '/login',
  expired: '/login',
  active: '/account',
  admin: PRO_HOME_PATH,
}

export const ACCOUNT_NAV_LABEL_KEYS: Record<CustomerSessionStatus, string> = {
  none: 'account.nav',
  expired: 'account.nav',
  active: 'account.nav',
  admin: 'account.navAdmin',
}

export const ACCOUNT_NAV_ICONS: Record<CustomerSessionStatus, AccountNavIcon> = {
  none: 'CircleUser',
  expired: 'CircleUser',
  active: 'CircleUser',
  admin: 'LayoutDashboard',
}
