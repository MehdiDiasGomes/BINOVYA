import type { ProBookingStatus, ProNavItem, ProStatusFilter } from '@/types/pro'
import type { ProRescheduleErrorCode, ProRescheduleForceableCode } from '@/types/proAvailability'

export const ADMIN_ROLE: string = 'admin'

export const PRO_HOME_PATH: string = '/pro'

export const PRO_LOGIN_PATH: string = '/pro/login'

export const PRO_CONFIRM_PATH: string = '/pro/confirm'

export const PRO_INTERVENTIONS_PATH: string = '/pro/interventions'

export const PRO_AVAILABILITY_PATH: string = '/pro/availability'

export const PRO_NAV_SHEET_ID: string = 'pro-mobile-menu'

export const PRO_SIDEBAR_MIN_WIDTH: number = 1024

export const PRO_SIDEBAR_QUERY: string = `(min-width: ${PRO_SIDEBAR_MIN_WIDTH}px)`

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

export const PRO_DIALOG_OVERLAY_CLASS: string =
  'fixed inset-0 z-50 bg-navy-950/60 ease-brand data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-press data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-lift motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none'

export const PRO_NAV_LINK_CLASS: string =
  'group relative flex min-h-11 items-center gap-3 rounded-lg px-4 text-sm font-bold text-white/80 transition-colors duration-press ease-brand before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-turquoise before:opacity-0 before:transition-opacity before:duration-press before:ease-brand hover:bg-white/5 hover:text-turquoise focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 aria-[current=page]:bg-white/10 aria-[current=page]:font-black aria-[current=page]:text-white aria-[current=page]:before:opacity-100 motion-reduce:transition-none motion-reduce:before:transition-none'

export const PRO_NAV_ITEMS: ProNavItem[] = [
  { path: PRO_HOME_PATH, labelKey: 'pro.nav.planning', icon: 'CalendarDays' },
  { path: PRO_INTERVENTIONS_PATH, labelKey: 'pro.nav.interventions', icon: 'ClipboardList' },
  { path: PRO_AVAILABILITY_PATH, labelKey: 'pro.nav.availability', icon: 'CalendarCog' },
]

export const PRO_DAY_CAPACITY_MAX: number = 50

export const PRO_DAY_NOTE_MAX_LENGTH: number = 500

export const PRO_AVAILABILITY_HORIZON_DAYS: number = 365

export const PRO_AVAILABILITY_MAX_RANGE_DAYS: number = 400

export const PRO_RESCHEDULE_FORCEABLE_CODES: ProRescheduleForceableCode[] = [
  'outOfArea',
  'dayClosed',
  'dayFull',
  'outOfSector',
]

export const PRO_RESCHEDULE_ERROR_CODES: ProRescheduleErrorCode[] = [
  ...PRO_RESCHEDULE_FORCEABLE_CODES,
  'notFound',
  'notPaid',
  'invalidDate',
  'sameDate',
  'pastDate',
  'tooFar',
  'tooFrequent',
]
