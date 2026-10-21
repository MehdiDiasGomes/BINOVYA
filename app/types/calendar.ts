import type { CalendarRootProps } from 'reka-ui'

export type CalendarWeekStart = NonNullable<CalendarRootProps['weekStartsOn']>

export type CalendarVisibleRange = {
  from: string
  to: string
}

export type CalendarDayAttributes = {
  'aria-label'?: string
}
