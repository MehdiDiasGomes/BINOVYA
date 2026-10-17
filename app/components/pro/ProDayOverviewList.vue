<template>
  <div>
    <Motion
      v-if="props.days.length === 0"
      as="p"
      :initial="{ opacity: 0, y: CONTENT_ENTER_OFFSET }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="CONTENT_ENTER_TRANSITION"
      class="rounded-2xl border border-border bg-white p-6 text-[15px] text-ink/80 shadow-sm"
    >
      {{ $t('pro.availability.days.empty', { date: untilLabel }) }}
    </Motion>
    <ul v-else class="grid gap-4 md:grid-cols-2">
      <Reveal
        v-for="(day, index) in props.days"
        :key="day.date"
        as="li"
        :delay="Math.min(index, REVEAL_MAX_STAGGER_STEPS) * REVEAL_STAGGER"
        :class="
          cn(
            'flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm',
            attentionText(day) ? 'border-amber-500/60' : 'border-border',
          )
        "
      >
        <h3 class="font-heading text-lg font-black leading-tight text-ink">{{ dayTitle(day) }}</h3>
        <dl class="divide-y divide-border text-sm">
          <div
            class="flex flex-col gap-0.5 py-2 first:pt-0 sm:flex-row sm:justify-between sm:gap-3"
          >
            <dt class="text-ink/70">{{ $t('pro.availability.days.capacity') }}</dt>
            <dd class="font-bold text-ink sm:text-right">{{ capacityText(day) }}</dd>
          </div>
          <div
            v-if="day.sector"
            class="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-3"
          >
            <dt class="shrink-0 text-ink/70">{{ $t('pro.availability.days.sector') }}</dt>
            <dd class="break-words font-bold text-ink sm:text-right">{{ sectorText(day) }}</dd>
          </div>
          <div
            v-if="day.note"
            class="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-3"
          >
            <dt class="shrink-0 text-ink/70">{{ $t('pro.availability.days.note') }}</dt>
            <dd class="min-w-0 break-words font-bold text-ink sm:text-right">{{ day.note }}</dd>
          </div>
          <div class="flex flex-col gap-0.5 py-2 last:pb-0 sm:flex-row sm:justify-between sm:gap-3">
            <dt class="text-ink/70">{{ $t('pro.availability.days.bookings') }}</dt>
            <dd class="font-bold text-ink sm:text-right">{{ bookingsText(day) }}</dd>
          </div>
        </dl>
        <p
          v-if="attentionText(day)"
          class="flex items-start gap-2 rounded-xl border border-amber-500/60 bg-amber-50 px-3 py-2.5 text-sm font-bold text-ink"
        >
          <Icon
            name="TriangleAlert"
            :size="16"
            aria-hidden="true"
            class="mt-0.5 shrink-0 text-amber-700"
          />
          {{ attentionText(day) }}
        </p>
        <div class="mt-auto flex flex-wrap gap-3">
          <AppButton
            v-if="day.paidCount > 0"
            :to="planningRoute(day)"
            variant="secondary"
            size="sm"
            icon="CalendarDays"
            class="flex-1 sm:flex-none"
          >
            {{ $t('pro.availability.days.planning') }}
            <span class="sr-only">{{
              $t('pro.availability.days.ofDay', { date: dayTitle(day) })
            }}</span>
          </AppButton>
          <AppButton
            variant="secondary"
            size="sm"
            icon="Pencil"
            class="flex-1 sm:flex-none"
            @click="emit('edit', day.date)"
          >
            {{ $t('pro.availability.days.edit') }}
            <span class="sr-only">{{
              $t('pro.availability.days.editOfDay', { date: dayTitle(day) })
            }}</span>
          </AppButton>
        </div>
      </Reveal>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { ProDayOverview } from '@/types/proAvailability'
import type { RouteLocationRaw } from 'vue-router'

import {
  CONTENT_ENTER_OFFSET,
  CONTENT_ENTER_TRANSITION,
  REVEAL_MAX_STAGGER_STEPS,
  REVEAL_STAGGER,
} from '@/constants/motion'
import { PRO_HOME_PATH } from '@/constants/pro'
import { cn } from '@/lib/utils'
import { formatFullDate, formatWeekday } from '@/utils/date'
import { dayStatus, dayStatusTitle, daySectorText } from '@/utils/proAvailability'
import { capitalizeFirst } from '@/utils/text'

const props = withDefaults(
  defineProps<{
    days?: ProDayOverview[]
    until?: string
  }>(),
  {
    days: () => [],
    until: '',
  },
)

const emit = defineEmits<{
  edit: [date: string]
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const dayTitle = (day: ProDayOverview): string =>
  capitalizeFirst(formatFullDate(day.date, locale.value), locale.value)

const capacityText = (day: ProDayOverview): string =>
  day.capacitySource === 'override'
    ? t('pro.availability.days.capacityOverride', { n: day.capacity }, day.capacity)
    : t(
        'pro.availability.days.capacityRule',
        { n: day.capacity, weekday: formatWeekday(day.weekday, locale.value) },
        day.capacity,
      )

const untilLabel: ComputedRef<string> = computed(() =>
  props.until ? formatFullDate(props.until, locale.value) : '',
)

const sectorText = (day: ProDayOverview): string => daySectorText(day, locale.value, t)

const bookingsText = (day: ProDayOverview): string =>
  t(
    'pro.availability.days.bookingsValue',
    { n: day.activeCount, paid: day.paidCount },
    day.activeCount,
  )

const attentionText = (day: ProDayOverview): string =>
  dayStatus(day)?.tone === 'warning' ? dayStatusTitle(day, locale.value, t) : ''

const planningRoute = (day: ProDayOverview): RouteLocationRaw =>
  localePath({ path: PRO_HOME_PATH, query: { date: day.date } })
</script>
