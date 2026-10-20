<template>
  <div class="min-h-[70vh]">
    <p class="sr-only" role="status" aria-live="polite">{{ liveStatus }}</p>
    <div class="mx-auto max-w-[1180px] space-y-8 px-4 pb-16 pt-8 sm:px-8 sm:pt-12">
      <div :class="HERO_ENTER_CLASS">
        <span class="mb-2 block text-[12.5px] font-black uppercase tracking-[1.5px] text-primary">
          {{ $t('pro.planning.eyebrow') }}
        </span>
        <h1
          ref="titleRef"
          tabindex="-1"
          class="text-[28px] font-black leading-tight text-ink outline-none sm:text-[32px]"
        >
          {{ $t('pro.planning.title', { date: dayLabel }) }}
        </h1>
      </div>

      <div
        role="group"
        :aria-label="$t('pro.planning.dateGroup')"
        class="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:flex sm:flex-wrap"
      >
        <AppButton
          variant="secondary"
          icon="ChevronLeft"
          class="w-12 px-0 sm:w-auto sm:px-5"
          @click="shiftDay(-1)"
        >
          <span class="sr-only sm:not-sr-only">{{ $t('pro.planning.previousDay') }}</span>
        </AppButton>
        <DatePicker
          :id="DATE_FIELD_ID"
          :model-value="selectedDate"
          :label="$t('pro.planning.dateLabel')"
          is-label-hidden
          :marked-days="markedDays"
          class="min-w-0"
          @update:model-value="selectDate"
          @visible-range="loadDays"
        />
        <AppButton
          variant="secondary"
          trailing-icon="ChevronRight"
          class="w-12 px-0 sm:w-auto sm:px-5"
          @click="shiftDay(1)"
        >
          <span class="sr-only sm:not-sr-only">{{ $t('pro.planning.nextDay') }}</span>
        </AppButton>
        <AppButton
          variant="secondary"
          icon="CalendarDays"
          :is-disabled="selectedDate === today"
          class="col-span-3 sm:col-auto"
          @click="selectDate(today)"
        >
          {{ $t('pro.planning.today') }}
        </AppButton>
      </div>

      <Motion
        v-if="isRoundVisible"
        as="section"
        aria-labelledby="pro-round-title"
        :initial="{ opacity: 0, y: CONTENT_ENTER_OFFSET }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="CONTENT_ENTER_TRANSITION"
        class="rounded-2xl border border-border bg-white p-5 shadow-sm"
      >
        <h2 id="pro-round-title" class="text-lg font-black text-ink">
          {{ $t('pro.planning.round.title') }}
        </h2>
        <div class="min-h-40 sm:min-h-30 lg:min-h-25">
          <div v-if="isLoading" aria-hidden="true">
            <div class="mt-1 text-sm">
              <div class="flex h-lh items-center">
                <SkeletonBlock class="h-3 w-full" />
              </div>
              <div class="flex h-lh items-center">
                <SkeletonBlock class="h-3 w-full" />
              </div>
              <div class="flex h-lh items-center lg:hidden">
                <SkeletonBlock class="h-3 w-full" />
              </div>
              <div class="flex h-lh items-center sm:hidden">
                <SkeletonBlock class="h-3 w-full" />
              </div>
              <div class="flex h-lh items-center sm:hidden">
                <SkeletonBlock class="h-3 w-2/3" />
              </div>
            </div>
            <SkeletonBlock class="mt-4 h-11 w-56 rounded-lg" />
          </div>
          <p v-else-if="roundUrls.length === 0" class="mt-1 text-sm text-ink/80">
            {{ $t('pro.planning.round.empty') }}
          </p>
          <template v-else>
            <p class="mt-1 text-sm text-ink/80">
              {{ $t('pro.planning.round.text', { max: GOOGLE_MAPS_MAX_WAYPOINTS }) }}
            </p>
            <ul class="mt-4 flex flex-wrap gap-3">
              <li v-for="(url, index) in roundUrls" :key="url">
                <AppButton
                  :href="url"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                  size="sm"
                  class="gap-2.5"
                >
                  <template #leading>
                    <GoogleMapsIcon :size="20" class="size-5" />
                  </template>
                  {{ roundLinkLabel(index) }}
                  <span class="sr-only">{{ $t('pro.newTab') }}</span>
                </AppButton>
              </li>
            </ul>
          </template>
        </div>
      </Motion>

      <section aria-labelledby="pro-day-interventions-title">
        <h2
          id="pro-day-interventions-title"
          ref="listTitleRef"
          tabindex="-1"
          class="mb-4 text-[22px] font-black text-ink outline-none"
        >
          {{ $t('pro.planning.listTitle') }}
        </h2>
        <Motion
          v-if="loadedDay && loadedDayStatus"
          :initial="{ opacity: 0, y: CONTENT_ENTER_OFFSET }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="CONTENT_ENTER_TRANSITION"
          class="mb-6"
        >
          <ProDayStatusPanel :day="loadedDay" :status="loadedDayStatus" />
        </Motion>
        <ProInterventionList
          ref="listRef"
          :interventions="planning?.interventions ?? []"
          :is-loading="isLoading"
          :has-error="hasError"
          :empty-text="$t('pro.planning.empty')"
          @retry="reload"
          @rescheduled="handleRescheduled"
          @stale="reload"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GeoPoint } from '@/types/booking'
import type { ProPlanning } from '@/types/pro'
import type { ProDayOverview, ProDayStatus } from '@/types/proAvailability'

import { PAGE_DATA_TIMEOUT_MS } from '@/constants/account'
import {
  CONTENT_ENTER_OFFSET,
  CONTENT_ENTER_TRANSITION,
  HERO_ENTER_CLASS,
} from '@/constants/motion'
import { GOOGLE_MAPS_MAX_WAYPOINTS } from '@/constants/pro'
import { addDaysToIsoDate, formatFullDate } from '@/utils/date'
import { isIsoDate } from '@/utils/dateValidation'
import { roundDirectionsUrls } from '@/utils/googleMaps'
import { dayAlertTitle, dayStatus } from '@/utils/proAvailability'

definePageMeta({
  layout: 'pro',
  middleware: ['admin'],
})

const DATE_FIELD_ID: string = 'pro-planning-date'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const today: Readonly<Ref<string>> = useBusinessToday()

const selectedDate: ComputedRef<string> = computed(() => {
  const date: unknown = route.query.date
  return typeof date === 'string' && isIsoDate(date) ? date : today.value
})

const {
  data: planning,
  status,
  error,
  refresh,
} = useFetch<ProPlanning>('/api/pro/planning', {
  key: 'pro-planning',
  query: { date: selectedDate },
  server: false,
  lazy: true,
  timeout: PAGE_DATA_TIMEOUT_MS,
})

const {
  titleRef,
  listTitleRef,
  listRef,
  hasError,
  isLoading,
  isMounted,
  reload,
  actionNotice,
  handleRescheduled,
} = useProPageState({ data: planning, status, error, refresh })

const { markedDays, loadDays } = useProInterventionDays(planning)

const dayLabel: ComputedRef<string> = computed(() =>
  formatFullDate(selectedDate.value, locale.value),
)

const isRoundVisible: ComputedRef<boolean> = computed(
  () => isLoading.value || Boolean(planning.value?.depot),
)

const roundUrls: ComputedRef<string[]> = computed(() => {
  const depot: GeoPoint | null = planning.value?.depot ?? null
  return depot && !isLoading.value
    ? roundDirectionsUrls(
        depot,
        (planning.value?.interventions ?? []).filter(
          intervention => intervention.status === 'paid',
        ),
      )
    : []
})

const loadedDay: ComputedRef<ProDayOverview | null> = computed(() =>
  isLoading.value || hasError.value ? null : (planning.value?.day ?? null),
)

const loadedDayStatus: ComputedRef<ProDayStatus | null> = computed(() =>
  loadedDay.value ? dayStatus(loadedDay.value) : null,
)

const roundLinkLabel = (index: number): string =>
  roundUrls.value.length > 1
    ? t('pro.planning.round.part', { part: index + 1, total: roundUrls.value.length })
    : t('pro.planning.round.link')

const liveStatus: ComputedRef<string> = computed(() => {
  if (!isMounted.value) {
    return ''
  }
  if (actionNotice.value) {
    return actionNotice.value
  }
  if (isLoading.value) {
    return t('pro.planning.loading')
  }
  if (hasError.value) {
    return ''
  }
  const count: number = planning.value?.interventions.length ?? 0
  const countText: string = t('pro.planning.count', { date: dayLabel.value, n: count }, count)
  const statusTitle: string = loadedDay.value ? dayAlertTitle(loadedDay.value, locale.value, t) : ''
  return statusTitle
    ? t('pro.planning.loadedStatus', { count: countText, status: statusTitle })
    : countText
})

const selectDate = async (date: string): Promise<void> => {
  if (!isIsoDate(date) || date === selectedDate.value) {
    return
  }
  await router.replace({ query: { ...route.query, date } })
}

const shiftDay = async (days: number): Promise<void> => {
  await selectDate(addDaysToIsoDate(selectedDate.value, days))
}

useSeoMeta({
  title: () => t('pro.planning.seo.title'),
  robots: 'noindex, nofollow',
})
</script>
