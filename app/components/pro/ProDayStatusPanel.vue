<template>
  <div
    :data-tone="props.status.tone"
    :class="
      cn(
        'rounded-2xl border p-5 sm:p-6',
        isWarning ? 'border-amber-500/60 bg-amber-50' : 'border-border bg-paper-2',
      )
    "
  >
    <h3 class="flex items-start gap-2.5 font-heading text-lg font-black leading-tight text-ink">
      <Icon
        :name="isWarning ? 'TriangleAlert' : 'Info'"
        :size="22"
        aria-hidden="true"
        :class="cn('mt-px shrink-0', isWarning ? 'text-amber-700' : 'text-ink/70')"
      />
      {{ title }}
    </h3>
    <div class="mt-2 space-y-1.5 text-[15px] leading-relaxed text-ink/80 sm:pl-8">
      <p>{{ reason }}</p>
      <p v-if="props.day.note" class="break-words">
        {{ $t('pro.dayStatus.note', { note: props.day.note }) }}
      </p>
      <p v-if="advice">{{ advice }}</p>
    </div>
    <div
      v-if="isMoveVisible || editRoute"
      class="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:pl-8"
    >
      <AppButton
        v-if="isMoveVisible"
        variant="warning"
        icon="CalendarClock"
        class="w-full sm:w-auto"
        @click="emit('move')"
      >
        {{ moveLabel }}
      </AppButton>
      <AppButton
        v-if="editRoute"
        :to="editRoute"
        variant="secondary"
        icon="CalendarCog"
        class="w-full sm:w-auto"
      >
        {{ editLabel }}
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProDayOverview, ProDayStatus } from '@/types/proAvailability'
import type { RouteLocationRaw } from 'vue-router'

import { PRO_AVAILABILITY_PATH } from '@/constants/pro'
import { cn } from '@/lib/utils'
import { formatWeekday } from '@/utils/date'
import { dayStatusTitle, isOverrideDateEditable } from '@/utils/proAvailability'

const props = withDefaults(
  defineProps<{
    day: ProDayOverview
    status: ProDayStatus
    canMove?: boolean
  }>(),
  {
    canMove: false,
  },
)

const emit = defineEmits<{
  move: []
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const today: Readonly<Ref<string>> = useBusinessToday()

const isWarning: ComputedRef<boolean> = computed(() => props.status.tone === 'warning')

const isClosed: ComputedRef<boolean> = computed(() => props.status.kind !== 'overCapacity')

const isMoveVisible: ComputedRef<boolean> = computed(() => isWarning.value && props.canMove)

const title: ComputedRef<string> = computed(() => dayStatusTitle(props.day, locale.value, t))

const reason: ComputedRef<string> = computed(() => {
  const isOverride: boolean = props.day.capacitySource === 'override'
  const closedKey: string = isOverride
    ? 'pro.dayStatus.reason.closedOverride'
    : 'pro.dayStatus.reason.closedRule'
  const overCapacityKey: string = isOverride
    ? 'pro.dayStatus.reason.overCapacityOverride'
    : 'pro.dayStatus.reason.overCapacityRule'
  return t(isClosed.value ? closedKey : overCapacityKey, {
    n: props.day.activeCount,
    capacity: props.day.capacity,
    weekday: formatWeekday(props.day.weekday, locale.value),
  })
})

const advice: ComputedRef<string> = computed(() => {
  if (props.status.kind === 'closedWithBookings') {
    return t(
      'pro.dayStatus.advice.closedWithBookings',
      { n: props.status.count },
      props.status.count,
    )
  }
  if (props.status.kind === 'overCapacity') {
    const excess: number = props.day.activeCount - props.day.capacity
    return t('pro.dayStatus.advice.overCapacity', { n: excess }, excess)
  }
  return ''
})

const moveLabel: ComputedRef<string> = computed(() =>
  props.status.kind === 'closedWithBookings'
    ? t('pro.dayStatus.move', props.status.count)
    : t('pro.dayStatus.chooseToMove'),
)

const editLabel: ComputedRef<string> = computed(() =>
  isClosed.value ? t('pro.dayStatus.reopen') : t('pro.dayStatus.increase'),
)

const editRoute: ComputedRef<RouteLocationRaw | null> = computed(() =>
  isOverrideDateEditable(props.day.date, today.value)
    ? localePath({ path: PRO_AVAILABILITY_PATH, query: { date: props.day.date } })
    : null,
)
</script>
