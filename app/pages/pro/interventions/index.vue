<template>
  <div class="min-h-[70vh]">
    <p class="sr-only" role="status" aria-live="polite">{{ liveStatus }}</p>
    <div class="mx-auto max-w-[1180px] space-y-8 px-4 pb-16 pt-8 sm:px-8 sm:pt-12">
      <div :class="HERO_ENTER_CLASS">
        <span class="mb-2 block text-[12.5px] font-black uppercase tracking-[1.5px] text-primary">
          {{ $t('pro.list.eyebrow') }}
        </span>
        <h1
          ref="titleRef"
          tabindex="-1"
          class="text-[28px] font-black leading-tight text-ink outline-none sm:text-[32px]"
        >
          {{ $t('pro.list.title') }}
        </h1>
      </div>

      <div
        role="search"
        :aria-label="$t('pro.list.filters.label')"
        class="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4 lg:items-start"
      >
        <div>
          <span class="mb-1.5 block text-sm font-bold text-ink">
            {{ $t('pro.list.filters.status') }}
          </span>
          <SelectRoot v-model="draft.status">
            <SelectTrigger
              :id="STATUS_FIELD_ID"
              :aria-label="statusTriggerLabel"
              :class="
                cn(
                  FIELD_INPUT_CLASS,
                  'w-full cursor-pointer shadow-none hover:border-primary data-[size=default]:h-12',
                )
              "
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent :class="FLOATING_PANEL_CLASS">
              <SelectItem
                v-for="filter in PRO_STATUS_FILTERS"
                :key="filter"
                :value="filter"
                :class="SELECT_ITEM_CLASS"
              >
                {{ $t(`pro.list.filters.statuses.${filter}`) }}
              </SelectItem>
            </SelectContent>
          </SelectRoot>
        </div>
        <DatePicker
          :id="FROM_FIELD_ID"
          v-model="draft.from"
          :label="$t('pro.list.filters.from')"
          :max="draft.to"
          :is-required="false"
          :marked-days="markedDays"
          @visible-range="loadDays"
        />
        <DatePicker
          :id="TO_FIELD_ID"
          v-model="draft.to"
          :label="$t('pro.list.filters.to')"
          :min="draft.from"
          :error="rangeError"
          :is-required="false"
          :marked-days="markedDays"
          @visible-range="loadDays"
        />
        <div class="sm:pt-6.5">
          <AppButton variant="secondary" class="w-full" @click="resetFilters">
            {{ $t('pro.list.filters.reset') }}
          </AppButton>
        </div>
      </div>

      <section aria-labelledby="pro-list-results-title">
        <h2
          id="pro-list-results-title"
          ref="listTitleRef"
          tabindex="-1"
          class="mb-4 text-[22px] font-black text-ink outline-none"
        >
          {{ resultsTitle }}
        </h2>
        <ProInterventionList
          ref="listRef"
          :interventions="result?.interventions ?? []"
          :is-loading="isLoading"
          :has-error="hasError"
          :empty-text="$t('pro.list.empty')"
          show-date
          origin="list"
          @retry="reload"
          @rescheduled="handleRescheduled"
          @stale="reload"
        />

        <nav
          v-if="pageCount > 1 && !isLoading && !hasError"
          :aria-label="$t('pro.list.pagination.label')"
          class="mt-8 grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:flex sm:justify-between"
        >
          <AppButton
            variant="secondary"
            size="sm"
            icon="ChevronLeft"
            :is-disabled="currentPage <= 1"
            class="w-11 px-0 sm:w-auto sm:px-4"
            @click="changePage(currentPage - 1)"
          >
            <span class="sr-only sm:not-sr-only">{{ $t('pro.list.pagination.previous') }}</span>
          </AppButton>
          <p class="text-center text-sm font-bold text-ink">
            {{ $t('pro.list.pagination.page', { page: currentPage, total: pageCount }) }}
          </p>
          <AppButton
            variant="secondary"
            size="sm"
            trailing-icon="ChevronRight"
            :is-disabled="currentPage >= pageCount"
            class="w-11 px-0 sm:w-auto sm:px-4"
            @click="changePage(currentPage + 1)"
          >
            <span class="sr-only sm:not-sr-only">{{ $t('pro.list.pagination.next') }}</span>
          </AppButton>
        </nav>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SelectRoot } from 'reka-ui'

import type { ProInterventionsPage } from '@/types/pro'

import { SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PAGE_DATA_TIMEOUT_MS } from '@/constants/account'
import { FIELD_INPUT_CLASS, FLOATING_PANEL_CLASS, SELECT_ITEM_CLASS } from '@/constants/form'
import { HERO_ENTER_CLASS } from '@/constants/motion'
import { PRO_STATUS_FILTERS } from '@/constants/pro'
import { cn } from '@/lib/utils'

definePageMeta({
  layout: 'pro',
  middleware: ['admin'],
})

const STATUS_FIELD_ID: string = 'pro-filter-status'
const FROM_FIELD_ID: string = 'pro-filter-from'
const TO_FIELD_ID: string = 'pro-filter-to'

const { t } = useI18n()
const { draft, query, currentPage, rangeError, resetFilters, goToPage } =
  useProInterventionsFilters()

const {
  data: result,
  status,
  error,
  refresh,
} = useFetch<ProInterventionsPage>('/api/pro/interventions', {
  key: 'pro-interventions',
  query,
  server: false,
  lazy: true,
  timeout: PAGE_DATA_TIMEOUT_MS,
})

const {
  titleRef,
  listTitleRef,
  listRef,
  hasError,
  hasLoaded,
  isLoading,
  isMounted,
  reload,
  actionNotice,
  handleRescheduled,
} = useProPageState({ data: result, status, error, refresh })

const { markedDays, loadDays } = useProInterventionDays(result)

const total: ComputedRef<number> = computed(() => result.value?.total ?? 0)

const pageCount: ComputedRef<number> = computed(() =>
  result.value ? Math.max(1, Math.ceil(result.value.total / result.value.pageSize)) : 1,
)

const statusTriggerLabel: ComputedRef<string> = computed(() =>
  t('common.fieldValue', {
    label: t('pro.list.filters.status'),
    value: t(`pro.list.filters.statuses.${draft.status}`),
  }),
)

const resultsTitle: ComputedRef<string> = computed(() => {
  if (isLoading.value || hasError.value) {
    return t('pro.list.resultsTitle')
  }
  return pageCount.value > 1
    ? t('pro.list.countPage', { n: total.value, page: currentPage.value, total: pageCount.value })
    : t('pro.list.count', { n: total.value }, total.value)
})

const toMoveCount: ComputedRef<number> = computed(
  () => result.value?.interventions.filter(intervention => intervention.isToMove).length ?? 0,
)

const loadedStatus: ComputedRef<string> = computed(() => {
  const count: string = t('pro.list.count', { n: total.value }, total.value)
  if (toMoveCount.value === 0) {
    return count
  }
  const toMoveKey: string =
    pageCount.value > 1 ? 'pro.list.toMoveCountPage' : 'pro.list.toMoveCount'
  return `${count}, ${t(toMoveKey, { n: toMoveCount.value }, toMoveCount.value)}`
})

const isPaging: Ref<boolean> = ref(false)

const hasFocusedPage: Ref<boolean> = ref(false)

const liveStatus: ComputedRef<string> = computed(() => {
  if (!isMounted.value) {
    return ''
  }
  if (actionNotice.value) {
    return actionNotice.value
  }
  if (hasFocusedPage.value) {
    return ''
  }
  if (isLoading.value) {
    return result.value ? '' : t('pro.list.loading')
  }
  return hasError.value ? '' : loadedStatus.value
})

const changePage = async (page: number): Promise<void> => {
  if (page < 1 || page > pageCount.value) {
    return
  }
  isPaging.value = true
  await goToPage(page)
}

watch(isLoading, async (loading: boolean): Promise<void> => {
  if (loading) {
    hasFocusedPage.value = false
    return
  }
  if (!isPaging.value) {
    return
  }
  isPaging.value = false
  hasFocusedPage.value = hasLoaded.value
  await nextTick()
  if (hasLoaded.value) {
    listTitleRef.value?.focus()
  } else {
    listRef.value?.retryButton?.focus()
  }
})

watch(result, async (page: ProInterventionsPage | undefined): Promise<void> => {
  if (page && page.page > pageCount.value) {
    await goToPage(pageCount.value, { replace: true })
  }
})

useSeoMeta({
  title: () => t('pro.list.seo.title'),
  robots: 'noindex, nofollow',
})
</script>
