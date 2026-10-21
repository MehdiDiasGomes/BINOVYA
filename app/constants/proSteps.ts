import type {
  ProInterventionProgress,
  ProProgressView,
  ProStepId,
  ProStepPhotoKinds,
  ProStepState,
} from '@/types/proSteps'

export const PRO_STEPS: [ProStepId, ...ProStepId[]] = ['directions', 'before', 'after', 'recap']

export const PRO_STEP_PHOTO_KINDS: ProStepPhotoKinds = { before: 'before', after: 'after' }

export const PRO_STEP_QUERY: string = 'step'

export const PRO_ORIGIN_QUERY: string = 'origin'

export const PRO_LIST_ORIGIN: string = 'list'

export const PRO_PROGRESS_VIEWS: Record<ProInterventionProgress, ProProgressView> = {
  todo: { labelKey: 'pro.progress.todo', icon: 'CircleDashed' },
  beforeDone: { labelKey: 'pro.progress.beforeDone', icon: 'CircleDot' },
  afterDone: { labelKey: 'pro.progress.afterDone', icon: 'CircleDot' },
  photosDone: { labelKey: 'pro.progress.photosDone', icon: 'Images' },
  completed: { labelKey: 'pro.progress.completed', icon: 'CircleCheck' },
  completedWithoutPhotos: { labelKey: 'pro.progress.completedWithoutPhotos', icon: 'CircleCheck' },
  cancelled: { labelKey: 'pro.progress.cancelled', icon: 'CircleX' },
  awaitingPayment: { labelKey: 'pro.progress.awaitingPayment', icon: 'Hourglass' },
  linkExpired: { labelKey: 'pro.progress.linkExpired', icon: 'TimerOff' },
}

export const PRO_STEP_SEGMENT_CLASS: string =
  'relative flex min-h-11 w-full items-center rounded-sm'

export const PRO_STEP_BAR_CLASS: string =
  'block h-2 w-full rounded-full border-2 transition-colors duration-press ease-brand motion-reduce:transition-none'

export const PRO_STEP_BAR_TONES: Record<ProStepState, string> = {
  current: 'h-3 border-navy-800 bg-navy-800',
  done: 'border-primary bg-primary',
  skipped: 'border-dashed border-amber-700 bg-amber-700/25',
  todo: 'border-ink/50 bg-transparent',
}

export const PRO_STEP_LINK_CLASS: string =
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2'
