import type { CalendarVisibleRange } from '@/types/calendar'
import type { Ref } from 'vue'

export type ProInterventionDayCount = {
  date: string
  count: number
}

export type ProInterventionDays = {
  days: ProInterventionDayCount[]
}

export type ProInterventionDaysState = {
  markedDays: Readonly<Ref<Record<string, number>>>
  loadDays: (range: CalendarVisibleRange) => Promise<void>
}
