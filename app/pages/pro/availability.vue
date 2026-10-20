<template>
  <div class="min-h-[70vh]">
    <p class="sr-only" role="status">{{ liveStatus }}</p>
    <div class="mx-auto max-w-[1180px] space-y-10 px-4 pb-16 pt-8 sm:px-8 sm:pt-12">
      <div :class="HERO_ENTER_CLASS">
        <span class="mb-2 block text-[12.5px] font-black uppercase tracking-[1.5px] text-primary">
          {{ $t('pro.availability.eyebrow') }}
        </span>
        <h1
          ref="titleRef"
          tabindex="-1"
          class="text-[28px] font-black leading-tight text-ink outline-none sm:text-[32px]"
        >
          {{ $t('pro.availability.title') }}
        </h1>
        <p class="mt-2 max-w-2xl text-[15px] text-ink/80">{{ $t('pro.availability.intro') }}</p>
      </div>

      <div v-if="isFirstLoad" aria-hidden="true" class="space-y-10">
        <div class="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <div class="mb-2 text-[22px]">
            <div class="flex h-lh items-center">
              <SkeletonBlock class="h-5 w-2/3 sm:w-1/3" />
            </div>
          </div>
          <div class="mb-4 text-sm">
            <div class="flex h-lh items-center">
              <SkeletonBlock class="h-3 w-full" />
            </div>
            <div class="flex h-lh items-center sm:hidden">
              <SkeletonBlock class="h-3 w-2/3" />
            </div>
          </div>
          <div class="mb-5 grid grid-cols-2 items-start gap-x-3 gap-y-4 sm:grid-cols-4 sm:gap-x-4">
            <div v-for="weekday in 7" :key="weekday">
              <div class="mb-1.5 text-sm">
                <div class="flex h-lh items-center">
                  <SkeletonBlock class="h-3 w-1/2" />
                </div>
              </div>
              <SkeletonBlock class="h-12 w-full rounded-lg" />
            </div>
          </div>
          <div class="border-t border-border pt-5">
            <SkeletonBlock class="h-12 w-full rounded-lg sm:w-56" />
          </div>
        </div>

        <div class="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <div class="mb-2 text-[22px]">
            <div class="flex h-lh items-center">
              <SkeletonBlock class="h-5 w-1/2 sm:w-1/4" />
            </div>
          </div>
          <div class="mb-5 text-sm">
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
          <div class="max-w-sm">
            <div class="mb-1.5 text-sm">
              <div class="flex h-lh items-center">
                <SkeletonBlock class="h-3 w-1/3" />
              </div>
            </div>
            <SkeletonBlock class="h-12 w-full rounded-lg" />
          </div>
        </div>

        <div>
          <div class="mb-4 text-[22px]">
            <div class="flex h-lh items-center">
              <SkeletonBlock class="h-5 w-3/4 sm:w-1/3" />
            </div>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <div
              v-for="placeholder in 2"
              :key="placeholder"
              :class="
                cn(
                  'flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm',
                  placeholder > 1 && 'hidden md:flex',
                )
              "
            >
              <div class="text-lg">
                <div class="flex h-lh items-center">
                  <SkeletonBlock class="h-4 w-2/3" />
                </div>
              </div>
              <div class="divide-y divide-border text-sm">
                <div
                  v-for="row in 2"
                  :key="row"
                  class="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-3"
                >
                  <div class="flex h-lh items-center sm:w-1/4">
                    <SkeletonBlock class="h-3 w-full" />
                  </div>
                  <div class="flex h-lh items-center sm:w-1/2">
                    <SkeletonBlock class="h-3 w-full" />
                  </div>
                </div>
              </div>
              <SkeletonBlock class="h-11 w-full rounded-lg sm:w-32" />
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="hasError" role="alert">
        <p :class="ERROR_MESSAGE_CLASS">
          <Icon name="CircleAlert" :size="16" aria-hidden="true" />
          {{ $t('pro.availability.loadError') }}
        </p>
        <AppButton ref="retryRef" variant="secondary" icon="RotateCw" class="mt-3" @click="reload">
          {{ $t('pro.retry') }}
        </AppButton>
      </div>

      <template v-else-if="availability">
        <Motion
          as="section"
          aria-labelledby="pro-rules-title"
          :initial="{ opacity: 0, y: CONTENT_ENTER_OFFSET }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="CONTENT_ENTER_TRANSITION"
          class="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 id="pro-rules-title" class="mb-2 text-[22px] font-black text-ink">
            {{ $t('pro.availability.rules.title') }}
          </h2>
          <ProWeekdayRulesForm
            :rules="availability.rules"
            @pending="announcePending"
            @saved="handleSaved"
            @failed="announce"
          />
        </Motion>

        <Motion
          as="section"
          aria-labelledby="pro-override-title"
          :initial="{ opacity: 0, y: CONTENT_ENTER_OFFSET }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="CONTENT_ENTER_TRANSITION"
          class="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6"
        >
          <h2
            id="pro-override-title"
            ref="overrideTitleRef"
            tabindex="-1"
            class="mb-2 text-[22px] font-black text-ink outline-none"
          >
            {{ $t('pro.availability.override.title') }}
          </h2>
          <p class="mb-5 text-sm text-ink/80">{{ $t('pro.availability.override.intro') }}</p>
          <ProDayOverrideForm
            v-model:date="selectedDate"
            :day="selectedDay"
            :rules="availability.rules"
            @pending="announcePending"
            @saved="handleSaved"
            @failed="announce"
          />
        </Motion>

        <section aria-labelledby="pro-days-title">
          <h2 id="pro-days-title" class="mb-4 text-[22px] font-black text-ink">
            {{ $t('pro.availability.days.title') }}
          </h2>
          <ProDayOverviewList :days="availability.days" :until="availability.to" @edit="editDay" />
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FocusTarget } from '@/types/button'
import type { ProAvailability, ProDayOverview } from '@/types/proAvailability'

import { PAGE_DATA_TIMEOUT_MS } from '@/constants/account'
import { ERROR_MESSAGE_CLASS } from '@/constants/feedback'
import {
  CONTENT_ENTER_OFFSET,
  CONTENT_ENTER_TRANSITION,
  HERO_ENTER_CLASS,
} from '@/constants/motion'
import { cn } from '@/lib/utils'
import { isOverrideDateEditable } from '@/utils/proAvailability'

definePageMeta({
  layout: 'pro',
  middleware: ['admin'],
})

const { t } = useI18n()
const route = useRoute()
const today: Readonly<Ref<string>> = useBusinessToday()
const { handleAuthStatus } = useProAuthError()
const { message: statusMessage, announce } = useLiveAnnouncement()

const titleRef: Ref<HTMLElement | null> = ref(null)
const retryRef: Ref<FocusTarget | null> = ref(null)
const overrideTitleRef: Ref<HTMLElement | null> = ref(null)
const queryDate: unknown = route.query.date
const initialDate: string =
  typeof queryDate === 'string' && isOverrideDateEditable(queryDate, today.value) ? queryDate : ''
const selectedDate: Ref<string> = ref(initialDate)

const loadFocusRef: ComputedRef<HTMLElement | null> = computed(() =>
  initialDate ? (overrideTitleRef.value ?? titleRef.value) : titleRef.value,
)

const {
  data: availability,
  status,
  error,
  refresh,
} = useFetch<ProAvailability>('/api/pro/availability', {
  key: 'pro-availability',
  server: false,
  lazy: true,
  timeout: PAGE_DATA_TIMEOUT_MS,
})

const hasError: ComputedRef<boolean> = computed(() => Boolean(error.value) || !availability.value)

const hasLoaded: ComputedRef<boolean> = computed(() => !hasError.value)

const { isLoading, isMounted, reload } = useAccountPageState({
  status,
  error,
  refresh,
  titleRef: loadFocusRef,
  loadedFocusRef: titleRef,
  retryRef,
  hasLoaded,
  onAuthError: async (statusCode: number): Promise<void> => {
    await handleAuthStatus(statusCode)
  },
})

const isFirstLoad: ComputedRef<boolean> = computed(() => isLoading.value && !availability.value)

const selectedDay: ComputedRef<ProDayOverview | null> = computed(
  () => availability.value?.days.find(day => day.date === selectedDate.value) ?? null,
)

const liveStatus: ComputedRef<string> = computed(() => {
  if (!isMounted.value) {
    return ''
  }
  if (statusMessage.value) {
    return statusMessage.value
  }
  return isFirstLoad.value ? t('pro.availability.loading') : ''
})

const announcePending = async (): Promise<void> => {
  await announce(t('pro.availability.savingStatus'))
}

const handleSaved = async (message: string): Promise<void> => {
  await announce(message)
  await refresh()
  if (hasError.value) {
    await nextTick()
    retryRef.value?.focus()
  }
}

const editDay = async (date: string): Promise<void> => {
  selectedDate.value = date
  await nextTick()
  overrideTitleRef.value?.focus()
}

useSeoMeta({
  title: () => t('pro.availability.seo.title'),
  robots: 'noindex, nofollow',
})
</script>
