import type { ProBookingStatus, ProNavItem, ProStatusFilter } from '@/types/pro'

import { SECONDARY_BUTTON_CLASS } from '@/constants/buttons'
import { cn } from '@/lib/utils'

export const ADMIN_ROLE: string = 'admin'

export const PRO_HOME_PATH: string = '/pro'

export const PRO_LOGIN_PATH: string = '/pro/login'

export const PRO_CONFIRM_PATH: string = '/pro/confirm'

export const PRO_INTERVENTIONS_PATH: string = '/pro/interventions'

export const PRO_ACCESS_DENIED_QUERY: string = 'denied'

export const PRO_PLANNING_STATUSES: ProBookingStatus[] = ['paid', 'completed']

export const PRO_LIST_STATUSES: ProBookingStatus[] = ['paid', 'completed', 'cancelled']

export const PRO_STATUS_FILTERS: [ProStatusFilter, ...ProStatusFilter[]] = [
  'all',
  ...PRO_LIST_STATUSES,
]

export const PRO_INTERVENTIONS_PAGE_SIZE: number = 50

export const PRO_INTERVENTIONS_MAX_PAGE: number = 1000

export const PRO_SKELETON_DETAIL_ROWS: number = 6

export const PRO_SKELETON_DATE_ROWS: number = 1

export const PRO_SKELETON_DETAIL_ROWS_WITH_DATE: number =
  PRO_SKELETON_DETAIL_ROWS + PRO_SKELETON_DATE_ROWS

export const PRO_SKELETON_PHONE_ROW: number = 0

export const PRO_SKELETON_COLLAPSED_ROWS: number = PRO_SKELETON_PHONE_ROW + 1

export const PRO_CARD_EXPANDED_MIN_WIDTH: number = 640

export const PRO_CARD_EXPANDED_QUERY: string = `(min-width: ${PRO_CARD_EXPANDED_MIN_WIDTH}px)`

export const GOOGLE_MAPS_DIRECTIONS_URL: string = 'https://www.google.com/maps/dir/'

export const GOOGLE_MAPS_MAX_WAYPOINTS: number = 9

export const PRO_MAPS_LINK_CLASS: string = cn(
  SECONDARY_BUTTON_CLASS,
  'inline-flex h-auto min-h-11 gap-2.5 px-5',
)

export const PRO_SIGN_OUT_BUTTON_CLASS: string =
  'flex min-h-11 items-center gap-2 rounded-lg border border-white/30 px-3 text-sm font-bold text-white transition-colors duration-press ease-brand hover:border-turquoise hover:text-turquoise focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 motion-reduce:transition-none'

export const PRO_NAV_ITEMS: ProNavItem[] = [
  { path: PRO_HOME_PATH, labelKey: 'pro.nav.planning' },
  { path: PRO_INTERVENTIONS_PATH, labelKey: 'pro.nav.interventions' },
]
