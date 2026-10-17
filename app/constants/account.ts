import type {
  AccountBookingStatus,
  AccountNavIcon,
  AccountPhotoKind,
  AccountStatusIcon,
  CustomerSessionStatus,
} from '@/types/account'
import type { MediaCardTone } from '@/types/mediaCard'

import { PRO_HOME_PATH } from '@/constants/pro'

export const LOGIN_LINK_LIFETIME_HOURS = 24

export const LINK_SESSION_MAX_AGE_DAYS: number = 7

export const CUSTOMER_SESSION_MAX_AGE_SECONDS: number = LINK_SESSION_MAX_AGE_DAYS * 24 * 60 * 60

export const ADMIN_SESSION_MAX_AGE_SECONDS: number = CUSTOMER_SESSION_MAX_AGE_SECONDS

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
