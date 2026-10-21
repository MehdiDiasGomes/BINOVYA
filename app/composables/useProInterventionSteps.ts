import type {
  ProStepId,
  ProStepItem,
  ProInterventionStepsOptions,
  ProInterventionStepsState,
} from '@/types/proSteps'
import type { LocationQuery, RouteLocationRaw } from 'vue-router'

import { PRO_STEP_QUERY, PRO_STEPS } from '@/constants/proSteps'
import { interventionSteps, parseStepQuery } from '@/utils/proSteps'

/**
 * Drives the four steps of an intervention through the `step` query, so the phone back button
 * returns to the previous step. Without a valid query, the step computed from the stored photos
 * is written with `replace`, adding no history entry; moving on pushes one. The first step is
 * announced on mount; on every later step change, focus moves to the step heading once rendered,
 * which names the step, so nothing else is announced.
 * @param options - Getters of the current photos and of the resume step, and the announcer
 * @returns Current step, the steps with their state, the heading ref, the link to a step and the
 * navigation action
 */
export const useProInterventionSteps = (
  options: ProInterventionStepsOptions,
): ProInterventionStepsState => {
  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()
  const titleRef: Ref<HTMLElement | null> = ref(null)

  const requestedStep: ComputedRef<number | null> = computed(() =>
    parseStepQuery(route.query[PRO_STEP_QUERY]),
  )

  const currentStep: ComputedRef<number> = computed(
    () => requestedStep.value ?? options.initialStep(),
  )

  const currentId: ComputedRef<ProStepId> = computed(
    () => PRO_STEPS[currentStep.value - 1] ?? PRO_STEPS[0],
  )

  const steps: ComputedRef<ProStepItem[]> = computed(() =>
    interventionSteps(currentStep.value, options.photos()),
  )

  const stepNotice = (step: number): string =>
    t('pro.steps.announce', {
      current: step,
      total: PRO_STEPS.length,
      name: t(`pro.steps.names.${PRO_STEPS[step - 1] ?? PRO_STEPS[0]}`),
    })

  const queryWithStep = (step: number): LocationQuery => ({
    ...route.query,
    [PRO_STEP_QUERY]: String(step),
  })

  const stepRoute = (step: number): RouteLocationRaw => ({ query: queryWithStep(step) })

  const goToStep = async (step: number): Promise<void> => {
    if (step !== currentStep.value && parseStepQuery(String(step)) !== null) {
      await router.push(stepRoute(step))
    }
  }

  onMounted(async (): Promise<void> => {
    options.onStepChange(stepNotice(currentStep.value))
    if (requestedStep.value === null) {
      await router.replace({ query: queryWithStep(currentStep.value) })
    }
  })

  watch(currentStep, async (): Promise<void> => {
    await nextTick()
    titleRef.value?.focus()
  })

  return { currentStep, currentId, steps, titleRef, stepRoute, goToStep }
}
