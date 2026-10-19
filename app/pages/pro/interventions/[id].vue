<template>
  <div class="min-h-[70vh]">
    <p class="sr-only" role="status" aria-live="polite">{{ liveStatus }}</p>
    <p class="sr-only" role="status" aria-live="polite">{{ photoNotice }}</p>
    <div class="mx-auto max-w-[720px] space-y-6 px-4 pb-16 pt-6 sm:px-8 sm:pt-10">
      <NuxtLink :to="localePath(backRoute)" :class="BACK_LINK_CLASS">
        <Icon name="ArrowLeft" :size="16" aria-hidden="true" />
        {{ backLabel }}
      </NuxtLink>

      <header>
        <p
          v-if="progress"
          class="mb-2 flex items-center gap-2 text-[12.5px] font-black uppercase tracking-[1.5px] text-primary"
        >
          <Icon :name="progress.icon" :size="16" aria-hidden="true" class="shrink-0" />
          {{ $t(progress.labelKey) }}
        </p>
        <span
          v-else
          class="mb-2 block text-[12.5px] font-black uppercase tracking-[1.5px] text-primary"
        >
          {{ $t('pro.steps.eyebrow') }}
        </span>
        <h1
          ref="titleRef"
          tabindex="-1"
          class="text-[28px] font-black leading-tight text-ink outline-none sm:text-[32px]"
        >
          {{ heading }}
        </h1>
        <p v-if="intervention" class="mt-1.5 break-words text-[15px] text-ink/80">
          {{ intervention.address }}
        </p>
        <div
          v-else-if="isLoading"
          aria-hidden="true"
          class="mt-1.5 flex h-lh items-center text-[15px]"
        >
          <SkeletonBlock class="h-3.5 w-2/3" />
        </div>
        <ProToMoveBadge v-if="intervention?.isToMove" class="mt-3" />
      </header>

      <ProInterventionPageSkeleton v-if="isLoading" />

      <div
        v-else-if="isNotFound"
        class="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-8"
      >
        <p class="text-[15px] text-ink/80">{{ $t('pro.steps.notFound.text') }}</p>
      </div>

      <Motion
        v-else-if="intervention"
        as="div"
        :initial="{ opacity: 0, y: CONTENT_ENTER_OFFSET }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="CONTENT_ENTER_TRANSITION"
        class="space-y-6"
      >
        <Motion
          :key="displayMode === 'steps' ? 'flow' : 'readonly'"
          as="div"
          :initial="hasModeChanged ? { opacity: 0, y: STEP_OFFSET } : false"
          :animate="{ opacity: 1, y: 0 }"
          :transition="STEP_TRANSITION"
          class="space-y-6"
        >
          <ProInterventionFlow
            v-if="displayMode === 'steps'"
            ref="flowRef"
            :intervention="intervention"
            :upload="upload"
            :context="photoContext"
            @complete="openComplete"
            @announce="announce"
          />
          <template v-else>
            <section
              v-if="completion"
              :aria-labelledby="successTitleId"
              class="rounded-2xl border border-green-700/40 bg-white p-5 shadow-sm"
            >
              <h2
                :id="successTitleId"
                ref="successTitleRef"
                tabindex="-1"
                class="flex items-center gap-3 text-[22px] font-black text-ink outline-none"
              >
                <Motion
                  as="span"
                  :initial="{ opacity: 0, scale: 0.5 }"
                  :animate="{ opacity: 1, scale: 1 }"
                  :transition="POP_SPRING"
                  class="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700"
                >
                  <Icon name="CircleCheck" :size="24" aria-hidden="true" />
                </Motion>
                {{ $t('pro.steps.completed.title') }}
              </h2>
              <p class="mt-3 text-[15px] text-ink/80">
                {{
                  completion.withoutPhotos
                    ? $t('pro.steps.completed.withoutPhotos')
                    : $t('pro.steps.completed.withPhotos')
                }}
              </p>
              <AppButton :to="localePath(backRoute)" icon="ArrowLeft" class="mt-4 w-full sm:w-auto">
                {{ backLabel }}
              </AppButton>
            </section>
            <section :aria-labelledby="modeTitleId">
              <h2
                :id="modeTitleId"
                ref="modeTitleRef"
                tabindex="-1"
                class="mb-4 text-[22px] font-black text-ink outline-none"
              >
                {{ $t(modeTitleKey) }}
              </h2>
              <ProStepRecap
                v-if="displayMode === 'completed'"
                :intervention="intervention"
                :upload="upload"
                :context="photoContext"
                is-completed
              />
              <p v-else class="text-[15px] text-ink/80">
                {{ $t(`pro.steps.${displayMode}.text`, { date: dateLabel }) }}
              </p>
            </section>
          </template>
        </Motion>
        <ProInterventionDetails :intervention="intervention" />
      </Motion>

      <div v-else role="alert">
        <p class="flex items-center gap-2 text-sm font-bold text-red-700">
          <Icon name="CircleAlert" :size="16" aria-hidden="true" />
          {{ $t('pro.steps.loadError') }}
        </p>
        <AppButton ref="retryRef" variant="secondary" icon="RotateCw" class="mt-3" @click="reload">
          {{ $t('pro.retry') }}
        </AppButton>
      </div>
    </div>

    <ProCompleteDialog
      v-model:open="isCompleteOpen"
      :intervention="intervention ?? null"
      :photos="photos"
      :trigger="completeTrigger"
      @completed="handleCompleted"
      @stale="reload"
    />
  </div>
</template>

<script setup lang="ts">
import type ProInterventionFlow from '@/components/pro/ProInterventionFlow.vue'
import type { FocusTarget } from '@/types/button'
import type { ProIntervention } from '@/types/pro'
import type { ProCompletedEvent } from '@/types/proPhotos'
import type { ProPhotoUploadState } from '@/types/proPhotoUpload'
import type { ProInterventionMode, ProInterventionOrigin, ProProgressView } from '@/types/proSteps'
import type { ShallowRef } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import { BACK_LINK_CLASS } from '@/constants/buttons'
import {
  CONTENT_ENTER_OFFSET,
  CONTENT_ENTER_TRANSITION,
  POP_SPRING,
  STEP_OFFSET,
  STEP_TRANSITION,
} from '@/constants/motion'
import { PRO_ORIGIN_QUERY, PRO_PROGRESS_VIEWS } from '@/constants/proSteps'
import { formatFullDate } from '@/utils/date'
import { proCustomerName } from '@/utils/proIntervention'
import {
  interventionBackRoute,
  interventionMode,
  interventionProgressStatus,
  parseOriginQuery,
} from '@/utils/proSteps'

definePageMeta({
  layout: 'pro',
  middleware: ['admin'],
})

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { handleAuthStatus } = useProAuthError()
const { message: actionNotice, announce } = useLiveAnnouncement()
const today: Readonly<Ref<string>> = useBusinessToday()

const bookingId: ComputedRef<string> = computed(() => String(route.params.id ?? ''))

const {
  data: intervention,
  status,
  error,
  refresh,
} = useFetch<ProIntervention>(
  () => `/api/pro/interventions/${encodeURIComponent(bookingId.value)}`,
  {
    key: () => `pro-intervention-${bookingId.value}`,
    server: false,
    lazy: true,
  },
)

const titleRef: Ref<HTMLElement | null> = ref(null)
const retryRef: Ref<FocusTarget | null> = ref(null)
const flowRef: Ref<InstanceType<typeof ProInterventionFlow> | null> = ref(null)
const modeTitleRef: Ref<HTMLElement | null> = ref(null)
const successTitleRef: Ref<HTMLElement | null> = ref(null)
const successTitleId: string = useId()
const modeTitleId: string = useId()

const completion: Ref<ProCompletedEvent | null> = ref(null)
const isCompleteOpen: Ref<boolean> = ref(false)
const completeTrigger: ShallowRef<HTMLElement | null> = shallowRef(null)

const isNotFound: ComputedRef<boolean> = computed(() =>
  [400, 404].includes(error.value?.statusCode ?? 0),
)

const hasContent: ComputedRef<boolean> = computed(() => Boolean(intervention.value))

const hasLoaded: ComputedRef<boolean> = computed(() => hasContent.value || isNotFound.value)

const loadedFocusRef: ComputedRef<HTMLElement | null> = computed(
  () => successTitleRef.value ?? modeTitleRef.value ?? flowRef.value?.titleRef ?? null,
)

const { isLoading, isMounted, reload } = useAccountPageState({
  status,
  error,
  refresh,
  titleRef,
  retryRef,
  hasLoaded,
  hasContent,
  loadedFocusRef,
  onAuthError: async (statusCode: number): Promise<void> => {
    await handleAuthStatus(statusCode)
  },
})

const announceAndReload = async (notice: string): Promise<void> => {
  await announce(notice)
  await reload()
}

const upload: ProPhotoUploadState = useProPhotoUpload({
  intervention: () => intervention.value ?? null,
  onOutdated: announceAndReload,
})

const { photos, notice: photoNotice } = upload

const mode: ComputedRef<ProInterventionMode | null> = computed(() =>
  intervention.value ? interventionMode(intervention.value, today.value) : null,
)

const displayMode: ComputedRef<ProInterventionMode | null> = computed(() =>
  completion.value && mode.value ? 'completed' : mode.value,
)

const hasModeChanged: Ref<boolean> = ref(false)

watch(
  displayMode,
  (next: ProInterventionMode | null, previous: ProInterventionMode | null | undefined): void => {
    if (next && previous && next !== previous) {
      hasModeChanged.value = true
    }
  },
)

watch(bookingId, (): void => {
  completion.value = null
  hasModeChanged.value = false
})

useProStepHistory((): ProInterventionMode | null => displayMode.value)

const modeTitleKey: ComputedRef<string> = computed(() =>
  displayMode.value === 'completed'
    ? 'pro.steps.completed.recapTitle'
    : `pro.steps.${displayMode.value}.title`,
)

const progress: ComputedRef<ProProgressView | null> = computed(() =>
  intervention.value
    ? PRO_PROGRESS_VIEWS[
        interventionProgressStatus({ ...intervention.value, photos: photos.value })
      ]
    : null,
)

const customerName: ComputedRef<string> = computed(() =>
  intervention.value ? proCustomerName(intervention.value.customer, t) : '',
)

const heading: ComputedRef<string> = computed(() => {
  if (customerName.value) {
    return customerName.value
  }
  return isNotFound.value ? t('pro.steps.notFound.title') : t('pro.steps.titleFallback')
})

const photoContext: ComputedRef<string> = computed(() =>
  t('pro.intervention.forName', { name: customerName.value }),
)

const dateLabel: ComputedRef<string> = computed(() =>
  intervention.value ? formatFullDate(intervention.value.scheduledDate, locale.value) : '',
)

const origin: ComputedRef<ProInterventionOrigin> = computed(() =>
  parseOriginQuery(route.query[PRO_ORIGIN_QUERY]),
)

const backRoute: ComputedRef<RouteLocationRaw> = computed(() =>
  interventionBackRoute(origin.value, intervention.value?.scheduledDate ?? '', route.query),
)

const backLabel: ComputedRef<string> = computed(() =>
  origin.value === 'list' ? t('pro.steps.backList') : t('pro.steps.backPlanning'),
)

const liveStatus: ComputedRef<string> = computed(() => {
  if (!isMounted.value) {
    return ''
  }
  return isLoading.value ? t('pro.steps.loading') : actionNotice.value
})

const openComplete = (trigger: HTMLElement | null): void => {
  completeTrigger.value = trigger
  isCompleteOpen.value = true
}

const handleCompleted = async (result: ProCompletedEvent): Promise<void> => {
  completion.value = result
  await nextTick()
  successTitleRef.value?.focus()
  const name: string = proCustomerName(result.intervention.customer, t)
  await announceAndReload(
    result.withoutPhotos
      ? t('pro.complete.successWithoutPhotos', { name })
      : t('pro.complete.success', { name }),
  )
}

useSeoMeta({
  title: () => t('pro.steps.seo.title'),
  robots: 'noindex, nofollow',
})
</script>
