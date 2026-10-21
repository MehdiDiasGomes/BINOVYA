import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref, watch, type Ref } from 'vue'

import { useProDayOverrideDrafts } from '../../../app/composables/useProDayOverrideDrafts'
import { day } from '../../support/pro-fixtures'

import type { ProDayOverrideDrafts, ProDayOverview } from '../../../app/types/proAvailability'

const DATE = '2026-10-24'

const OTHER_DATE = '2026-10-25'

const CLOSED_BY_OVERRIDE: ProDayOverview = day(DATE, {
  capacitySource: 'override',
  capacity: 0,
  isClosed: true,
  note: 'Fête',
})

type Setup = {
  date: Ref<string>
  stored: Ref<ProDayOverview | null>
  drafts: ProDayOverrideDrafts
}

const setup = (initial: ProDayOverview | null = null, date: string = DATE): Setup => {
  const dateRef: Ref<string> = ref(date)
  const stored: Ref<ProDayOverview | null> = ref(initial)
  const drafts: ProDayOverrideDrafts = useProDayOverrideDrafts({
    date: () => dateRef.value,
    day: () => stored.value,
  })
  return { date: dateRef, stored, drafts }
}

beforeEach(() => {
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('watch', watch)
})

describe('useProDayOverrideDrafts', () => {
  it('starts from the stored exception of the day', () => {
    const { drafts } = setup(CLOSED_BY_OVERRIDE)
    expect(drafts.capacityDraft.value).toBe(0)
    expect(drafts.noteDraft.value).toBe('Fête')
  })

  it('starts empty for a day that follows its weekday rule', () => {
    const { drafts } = setup(day(DATE))
    expect(drafts.capacityDraft.value).toBeNull()
    expect(drafts.noteDraft.value).toBe('')
  })

  it('clears the drafts, the errors and the feedback when the date changes', async () => {
    const { date, stored, drafts } = setup(CLOSED_BY_OVERRIDE)
    drafts.capacityError.value = 'invalid'
    drafts.feedback.value = 'saved'
    drafts.noteDraft.value = 'typed'
    stored.value = null
    date.value = OTHER_DATE
    await nextTick()
    expect(drafts.capacityDraft.value).toBeNull()
    expect(drafts.noteDraft.value).toBe('')
    expect(drafts.capacityError.value).toBe('')
    expect(drafts.feedback.value).toBe('')
  })

  it('resets the drafts from the refreshed day once it arrives after a save of the shown date', async () => {
    const { stored, drafts } = setup(null)
    drafts.noteDraft.value = 'brouillon'
    drafts.resetAfterRefresh(DATE, day(DATE, { note: 'Renfort' }))
    expect(drafts.noteDraft.value).toBe('brouillon')
    stored.value = day(DATE, { capacitySource: 'override', capacity: 2, note: 'Renfort' })
    await nextTick()
    expect(drafts.noteDraft.value).toBe('Renfort')
    expect(drafts.capacityDraft.value).toBe(2)
  })

  it('keeps the drafts when the day is refreshed without a save', async () => {
    const { stored, drafts } = setup(null)
    drafts.noteDraft.value = 'brouillon'
    stored.value = day(DATE, { note: 'Autre' })
    await nextTick()
    expect(drafts.noteDraft.value).toBe('brouillon')
  })

  it('does nothing for a response about a date the admin has left', async () => {
    const { date, stored, drafts } = setup(null)
    date.value = OTHER_DATE
    await nextTick()
    drafts.capacityDraft.value = 4
    drafts.noteDraft.value = 'Brouillon'
    drafts.resetAfterRefresh(DATE, day(DATE, { capacitySource: 'override', capacity: 1 }))
    stored.value = day(OTHER_DATE, { capacitySource: 'override', capacity: 9 })
    await nextTick()
    expect(drafts.capacityDraft.value).toBe(4)
    expect(drafts.noteDraft.value).toBe('Brouillon')
  })

  it('drops a pending reset when the date changes before the refreshed day arrives', async () => {
    const { date, stored, drafts } = setup(null)
    drafts.resetAfterRefresh(DATE, day(DATE, { capacitySource: 'override', capacity: 2 }))
    date.value = OTHER_DATE
    await nextTick()
    drafts.capacityDraft.value = 7
    stored.value = day(OTHER_DATE, { capacitySource: 'override', capacity: 3 })
    await nextTick()
    expect(drafts.capacityDraft.value).toBe(7)
  })

  it('resets at once when a removed exception leaves no day to refresh', () => {
    const { drafts } = setup(null)
    drafts.capacityDraft.value = 5
    drafts.noteDraft.value = 'x'
    drafts.resetAfterRefresh(DATE, null)
    expect(drafts.capacityDraft.value).toBeNull()
    expect(drafts.noteDraft.value).toBe('')
  })
})
