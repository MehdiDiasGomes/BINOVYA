import type {
  ProInterventionProgress,
  ProProgressView,
  ProStepId,
  ProStepPhotoKinds,
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
}

export const PRO_STEP_ITEM_CLASS: string =
  'flex h-full min-h-22 flex-col items-center justify-center gap-0.5 rounded-xl border px-0.5 py-1.5 text-center'

export const PRO_STEP_LINK_CLASS: string =
  'transition-colors duration-press ease-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none'
