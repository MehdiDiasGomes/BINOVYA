import type { MediaCardTone } from '@/types/mediaCard'
import type { ProBookingStatus, ProNavItem, ProStatusFilter } from '@/types/pro'
import type { ProRescheduleErrorCode, ProRescheduleForceableCode } from '@/types/proAvailability'
import type { ProCompleteErrorCode, ProPhotoErrorCode } from '@/types/proPhotos'

export const ADMIN_ROLE: string = 'admin'

export const PRO_HOME_PATH: string = '/pro'

export const PRO_LOGIN_PATH: string = '/pro/login'

export const PRO_CONFIRM_PATH: string = '/pro/confirm'

export const PRO_INTERVENTIONS_PATH: string = '/pro/interventions'

export const PRO_INTERVENTION_ROUTE_NAME: string = 'pro-interventions-id'

export const PRO_CREATE_PATH: string = '/pro/interventions/new'

export const PRO_AVAILABILITY_PATH: string = '/pro/availability'

export const PRO_NAV_SHEET_ID: string = 'pro-mobile-menu'

export const PRO_SIDEBAR_MIN_WIDTH: number = 1024

export const PRO_SIDEBAR_QUERY: string = `(min-width: ${PRO_SIDEBAR_MIN_WIDTH}px)`

export const PRO_ACCESS_DENIED_QUERY: string = 'denied'

export const PRO_PLANNING_STATUSES: ProBookingStatus[] = ['paid', 'completed']

export const PRO_PHOTO_STATUSES: ProBookingStatus[] = PRO_PLANNING_STATUSES

export const PRO_LIST_STATUSES: ProBookingStatus[] = [
  'pending_payment',
  'paid',
  'completed',
  'cancelled',
  'expired',
]

export const PRO_ADMIN_ONLY_STATUSES: ProBookingStatus[] = ['pending_payment', 'expired']

export const PRO_PENDING_PAYMENT_TONE: MediaCardTone = 'warning'

export const PRO_EXPIRED_LINK_TONE: MediaCardTone = 'neutral'

export const PRO_STATUS_FILTERS: [ProStatusFilter, ...ProStatusFilter[]] = [
  'all',
  ...PRO_LIST_STATUSES,
]

export const PRO_INTERVENTIONS_PAGE_SIZE: number = 50

export const PRO_INTERVENTIONS_MAX_PAGE: number = 1000

export const PRO_SKELETON_MOBILE_ROW_COUNT: number = 6

export const PRO_SKELETON_DETAIL_ROWS: number = 2

export const PRO_SKELETON_DATE_ROWS: number = 1

export const PRO_SKELETON_DETAIL_ROWS_WITH_DATE: number =
  PRO_SKELETON_DETAIL_ROWS + PRO_SKELETON_DATE_ROWS

export const GOOGLE_MAPS_MAX_WAYPOINTS: number = 9

export const PRO_DIALOG_CONTENT_CLASS: string =
  'fixed inset-x-0 bottom-0 z-50 max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-2xl border border-border bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink shadow-lg ease-brand focus-visible:outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-12 data-[state=closed]:duration-press data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-12 data-[state=open]:duration-lift sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95 motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none'

export const PRO_DIALOG_OVERLAY_CLASS: string =
  'fixed inset-0 z-50 bg-navy-950/60 ease-brand data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-press data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-lift motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none'

export const PRO_NAV_LINK_CLASS: string =
  'group relative flex min-h-11 items-center gap-3 rounded-lg px-4 text-sm font-bold text-white/80 transition-colors duration-press ease-brand before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-turquoise before:opacity-0 before:transition-opacity before:duration-press before:ease-brand hover:bg-white/5 hover:text-turquoise focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 aria-[current=page]:bg-white/10 aria-[current=page]:font-black aria-[current=page]:text-white aria-[current=page]:before:opacity-100 motion-reduce:transition-none motion-reduce:before:transition-none'

export const PRO_NAV_ITEMS: ProNavItem[] = [
  { path: PRO_HOME_PATH, labelKey: 'pro.nav.planning', icon: 'CalendarDays' },
  { path: PRO_INTERVENTIONS_PATH, labelKey: 'pro.nav.interventions', icon: 'ClipboardList' },
  { path: PRO_CREATE_PATH, labelKey: 'pro.nav.create', icon: 'CirclePlus' },
  { path: PRO_AVAILABILITY_PATH, labelKey: 'pro.nav.availability', icon: 'CalendarCog' },
]

export const PRO_DAY_CAPACITY_MAX: number = 50

export const PRO_DAY_NOTE_MAX_LENGTH: number = 500

export const PRO_AVAILABILITY_HORIZON_DAYS: number = 365

export const PRO_AVAILABILITY_MAX_RANGE_DAYS: number = 400

export const PRO_RESCHEDULE_TIMEOUT_MS: number = 15000

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

export const INTERVENTION_PHOTOS_BUCKET: string = 'intervention-photos'

export const PRO_PHOTO_MAX_BYTES: number = 5 * 1024 * 1024

export const PRO_PHOTO_MAX_DIMENSION: number = 2000

export const PRO_PHOTO_JPEG_QUALITIES: number[] = [0.85, 0.7, 0.55]

export const PRO_PHOTO_CACHE_CONTROL_SECONDS: string = '60'

export const PRO_PHOTO_UPLOAD_TIMEOUT_MS: number = 60000

export const PRO_COMPLETE_TIMEOUT_MS: number = 15000

export const PRO_PHOTO_ERROR_CODES: ProPhotoErrorCode[] = [
  'notFound',
  'notPaid',
  'futureDate',
  'invalidKind',
  'invalidImage',
  'tooLarge',
  'unreadable',
]

export const PRO_COMPLETE_ERROR_CODES: ProCompleteErrorCode[] = [
  'notFound',
  'alreadyCompleted',
  'notPaid',
  'futureDate',
  'missingPhotos',
]

export const PRO_ROW_SHELL_CLASS: string =
  'relative isolate flex min-h-20 min-w-0 items-center gap-3 rounded-2xl border border-white/10 px-3 py-2.5 text-white shadow-md shadow-navy-950/30 transition-[translate,scale,box-shadow] duration-lift ease-brand has-[a:active]:scale-[0.99] [@media(hover:hover)]:motion-safe:has-[a:hover]:not-has-[a:active]:-translate-y-0.5 [@media(hover:hover)]:has-[a:hover]:shadow-lg motion-reduce:transition-none motion-reduce:has-[a:active]:scale-100'

export const PRO_ROW_TONE_CLASSES: Record<MediaCardTone, string> = {
  success: 'bg-emerald-300/15 text-emerald-300',
  info: 'bg-cyan-300/15 text-cyan-300',
  warning: 'bg-amber-300/15 text-amber-300',
  neutral: 'bg-slate-300/15 text-slate-300',
}
