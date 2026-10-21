import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'

import { dayStatusTitle } from '../../../app/utils/proAvailability'
import enPro from '../../../i18n/locales/en/pro'
import frPro from '../../../i18n/locales/fr/pro'
import { day } from '../../support/pro-fixtures'

const DATE = '2026-10-24'

const i18n = createI18n({
  legacy: false,
  locale: 'fr',
  messages: { fr: { pro: frPro }, en: { pro: enPro } },
})

const titleFor = (locale: 'fr' | 'en', patch: Parameters<typeof day>[1]): string =>
  dayStatusTitle(day(DATE, patch), locale, (key, named, plural) =>
    i18n.global.t(key, named, { locale, plural }),
  )

const branch = (template: string, index: number): string => template.split(' | ')[index] ?? ''

const fill = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  )

describe('dayStatusTitle with the real vue-i18n messages', () => {
  const over = frPro.dayStatus.title.overCapacity
  const closed = frPro.dayStatus.title.closedWithBookings

  it('uses the singular capacity form and shows the booking count', () => {
    expect(titleFor('fr', { capacity: 1, activeCount: 3 })).toBe(
      fill(branch(over, 0), { bookings: 3 }),
    )
  })

  it('uses the plural capacity form and shows the booking count', () => {
    expect(titleFor('fr', { capacity: 2, activeCount: 4 })).toBe(
      fill(branch(over, 1), { bookings: 4, capacity: 2 }),
    )
  })

  it('uses the singular form for one paid booking on a closed day', () => {
    expect(titleFor('fr', { isClosed: true, capacity: 0, paidCount: 1 })).toBe(
      fill(branch(closed, 0), { weekday: 'Samedi' }),
    )
  })

  it('uses the plural form and the count for two paid bookings on a closed day', () => {
    expect(titleFor('fr', { isClosed: true, capacity: 0, paidCount: 2 })).toBe(
      fill(branch(closed, 1), { weekday: 'Samedi', bookings: 2 }),
    )
  })

  it('renders the English over-capacity title', () => {
    expect(titleFor('en', { capacity: 2, activeCount: 4 })).toBe(
      fill(branch(enPro.dayStatus.title.overCapacity, 1), { bookings: 4, capacity: 2 }),
    )
  })
})
