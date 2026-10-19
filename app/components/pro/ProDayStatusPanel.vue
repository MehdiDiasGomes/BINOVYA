<template>
  <div
    :data-tone="tone"
    :class="
      cn(
        'rounded-2xl border p-5 sm:p-6',
        isUrgent && 'border-2 border-destructive bg-red-50 shadow-lg shadow-destructive/20',
        isWarning && 'border-amber-500/60 bg-amber-50',
        !isUrgent && !isWarning && 'border-border bg-paper-2',
      )
    "
  >
    <h3
      :class="
        cn(
          'flex items-start font-heading font-black leading-tight',
          isUrgent ? 'gap-3 text-xl text-red-900' : 'gap-2.5 text-lg text-ink',
        )
      "
    >
      <span
        :class="
          cn(
            'mt-px flex shrink-0 items-center justify-center',
            isUrgent && '-mt-0.5 size-8 rounded-full bg-destructive text-white',
            isWarning && 'text-amber-700',
            !isUrgent && !isWarning && 'text-ink/70',
          )
        "
      >
        <Icon
          :name="isUrgent || isWarning ? 'TriangleAlert' : 'Info'"
          :size="isUrgent ? 18 : 22"
          aria-hidden="true"
        />
      </span>
      {{ title }}
    </h3>
    <div
      :class="
        cn(
          'mt-2 space-y-1.5 text-[15px] leading-relaxed text-ink/80',
          isUrgent ? 'sm:pl-11' : 'sm:pl-8',
        )
      "
    >
      <p>{{ reason }}</p>
      <p v-if="props.day.note" class="break-words">
        {{ $t('pro.dayStatus.note', { note: props.day.note }) }}
      </p>
      <p v-if="advice">{{ advice }}</p>
      <p v-if="instruction" class="font-bold text-red-900">{{ instruction }}</p>
    </div>
    <div
      v-if="editRoute"
      :class="
        cn('mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap', isUrgent ? 'sm:pl-11' : 'sm:pl-8')
      "
    >
      <AppButton :to="editRoute" variant="secondary" icon="CalendarCog" class="w-full sm:w-auto">
        {{ editLabel }}
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProDayAlertTone, ProDayOverview, ProDayStatus } from '@/types/proAvailability'
import type { RouteLocationRaw } from 'vue-router'

import { PRO_AVAILABILITY_PATH } from '@/constants/pro'
import { cn } from '@/lib/utils'
import { formatWeekday } from '@/utils/date'
import { dayAlertTitle, dayMoveCount, isOverrideDateEditable } from '@/utils/proAvailability'

const props = defineProps<{
  day: ProDayOverview
  status: ProDayStatus
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const today: Readonly<Ref<string>> = useBusinessToday()

const moveCount: ComputedRef<number> = computed(() => dayMoveCount(props.day))

const isUrgent: ComputedRef<boolean> = computed(() => moveCount.value > 0)

const isWarning: ComputedRef<boolean> = computed(
  () => !isUrgent.value && props.status.tone === 'warning',
)

const tone: ComputedRef<ProDayAlertTone> = computed(() =>
  isUrgent.value ? 'urgent' : props.status.tone,
)

const isClosed: ComputedRef<boolean> = computed(() => props.status.kind !== 'overCapacity')

const title: ComputedRef<string> = computed(() => dayAlertTitle(props.day, locale.value, t))

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
    return moveCount.value > 0
      ? t('pro.dayStatus.advice.overCapacity', { n: moveCount.value }, moveCount.value)
      : t('pro.dayStatus.advice.overCapacityNoMove')
  }
  return ''
})

const instruction: ComputedRef<string> = computed(() =>
  isUrgent.value && props.status.kind !== 'closed'
    ? t(`pro.dayStatus.urgent.instruction.${props.status.kind}`)
    : '',
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
