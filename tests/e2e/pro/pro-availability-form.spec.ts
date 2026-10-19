import { expect, test, type Locator, type Page } from '@playwright/test'

import { WEEKDAYS_MONDAY_FIRST } from '../../../app/constants/booking'
import { PRO_DAY_CAPACITY_MAX } from '../../../app/constants/pro'
import {
  addDaysToIsoDate,
  formatFullDate,
  formatMediumDate,
  formatWeekday,
  parseIsoDate,
} from '../../../app/utils/date'
import { capitalizeFirst } from '../../../app/utils/text'
import frPro from '../../../i18n/locales/fr/pro'
import { removeE2eAdmins } from '../../support/admin'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import {
  FAR_RANGES,
  farDates,
  readOverride,
  readRules,
  removeOverrides,
  saveOverride,
} from '../../support/pro'
import { delayRoute, pickCalendarDate, signInNewAdmin, waitForHydration } from '../support/pro'

import type { ProWeekdayRule } from '../../../app/types/proAvailability'

const DATES: string[] = farDates(FAR_RANGES.e2eOverrideDrafts)

const [
  SAVE_DAY,
  SAVE_FAIL_DAY,
  REMOVE_DAY,
  REMOVE_FAIL_DAY,
  FOLLOW_DAY,
  EMPTY_DAY,
  SAVE_EMPTY_DAY,
] = DATES as [string, string, string, string, string, string, string, string]

const AVAILABILITY = frPro.availability

const DRAFT_NOTE = 'Brouillon du jour suivant'

let rules: ProWeekdayRule[] = []

const overrideUrl = (date: string): RegExp => new RegExp(`/api/pro/availability/overrides/${date}$`)

const fullDate = (date: string): string => formatFullDate(date, 'fr-FR')

const capacityInput = (page: Page): Locator =>
  page.getByRole('spinbutton', { name: AVAILABILITY.override.capacity })

const noteField = (page: Page): Locator =>
  page.getByRole('textbox', { name: AVAILABILITY.override.note })

const ruleOf = (date: string): number =>
  rules.find(rule => rule.weekday === parseIsoDate(date).getDay())?.maxBookings ?? Number.NaN

const placeholderOf = (rule: number): string =>
  AVAILABILITY.capacityField.rulePlaceholder.replace('{count}', String(rule))

const openDay = async (page: Page, date: string): Promise<void> => {
  await page.goto(`/pro/availability?date=${date}`)
  await page.waitForLoadState('networkidle')
  await waitForHydration(page)
  await expect(capacityInput(page)).toBeVisible()
}

const dateTrigger = (page: Page): Locator =>
  page.getByRole('button', { name: new RegExp(`^${AVAILABILITY.override.date}`) })

const switchTo = (page: Page, date: string): Promise<void> =>
  pickCalendarDate(page, dateTrigger(page), date)

const typeNoteOfNextDay = async (page: Page, date: string): Promise<void> => {
  await switchTo(page, date)
  await expect(dateTrigger(page)).toHaveAccessibleName(new RegExp(formatMediumDate(date, 'fr-FR')))
  await noteField(page).fill(DRAFT_NOTE)
  await expect(noteField(page)).toBeFocused()
}

const dateOf = (date: string): string => addDaysToIsoDate(date, 1)

const status = (page: Page, text: string): Locator =>
  page.getByRole('status').filter({ hasText: text })

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  await removeOverrides(DATES)
  rules = await readRules()
})

test.afterAll(async () => {
  await removeOverrides(DATES)
  await cleanupE2eData()
  await removeE2eAdmins()
})

test.describe('exception form when the admin switches date during a request', () => {
  test('announces a save under the date it was made for and keeps the drafts of the new date', async ({
    page,
  }) => {
    await signInNewAdmin(page, 'pro-draft-save')
    await openDay(page, SAVE_DAY)
    await capacityInput(page).fill('2')
    const delayed = await delayRoute(page, overrideUrl(SAVE_DAY))
    await page.getByRole('button', { name: AVAILABILITY.override.save }).click()
    await delayed.requestSeen

    await typeNoteOfNextDay(page, dateOf(SAVE_DAY))
    delayed.release()

    await expect(
      status(page, AVAILABILITY.override.saved.replace('{date}', fullDate(SAVE_DAY))),
    ).toBeVisible()
    await expect(noteField(page)).toHaveValue(DRAFT_NOTE)
    await expect(noteField(page)).toBeFocused()
    expect((await readOverride(SAVE_DAY))?.max_bookings).toBe(2)
    expect(await readOverride(dateOf(SAVE_DAY))).toBeNull()
  })

  test('names the original date when the save fails after the switch', async ({ page }) => {
    await signInNewAdmin(page, 'pro-draft-save-fail')
    await openDay(page, SAVE_FAIL_DAY)
    await capacityInput(page).fill('2')
    const delayed = await delayRoute(page, overrideUrl(SAVE_FAIL_DAY), 'fail')
    await page.getByRole('button', { name: AVAILABILITY.override.save }).click()
    await delayed.requestSeen

    await typeNoteOfNextDay(page, dateOf(SAVE_FAIL_DAY))
    delayed.release()

    await expect(
      status(page, AVAILABILITY.override.saveErrorFor.replace('{date}', fullDate(SAVE_FAIL_DAY))),
    ).toBeVisible()
    await expect(noteField(page)).toHaveValue(DRAFT_NOTE)
    await expect(noteField(page)).toBeFocused()
    expect(await readOverride(SAVE_FAIL_DAY)).toBeNull()
  })

  test('announces a removal under the date it was made for and does not move the focus', async ({
    page,
  }) => {
    await saveOverride(REMOVE_DAY, 2)
    await signInNewAdmin(page, 'pro-draft-remove')
    await openDay(page, REMOVE_DAY)
    const delayed = await delayRoute(page, overrideUrl(REMOVE_DAY))
    await page.getByRole('button', { name: AVAILABILITY.override.remove }).click()
    await delayed.requestSeen

    await typeNoteOfNextDay(page, dateOf(REMOVE_DAY))
    delayed.release()

    await expect(status(page, fullDate(REMOVE_DAY))).toContainText(
      AVAILABILITY.override.removed.split('{date}')[0] ?? '',
    )
    await expect(noteField(page)).toHaveValue(DRAFT_NOTE)
    await expect(noteField(page)).toBeFocused()
    expect(await readOverride(REMOVE_DAY)).toBeNull()
  })

  test('names the original date when the removal fails after the switch', async ({ page }) => {
    await saveOverride(REMOVE_FAIL_DAY, 2)
    await signInNewAdmin(page, 'pro-draft-remove-fail')
    await openDay(page, REMOVE_FAIL_DAY)
    const delayed = await delayRoute(page, overrideUrl(REMOVE_FAIL_DAY), 'fail')
    await page.getByRole('button', { name: AVAILABILITY.override.remove }).click()
    await delayed.requestSeen

    await typeNoteOfNextDay(page, dateOf(REMOVE_FAIL_DAY))
    delayed.release()

    await expect(
      status(
        page,
        AVAILABILITY.override.removeErrorFor.replace('{date}', fullDate(REMOVE_FAIL_DAY)),
      ),
    ).toBeVisible()
    await expect(noteField(page)).toHaveValue(DRAFT_NOTE)
    expect((await readOverride(REMOVE_FAIL_DAY))?.max_bookings).toBe(2)
  })
})

test.describe('capacity field of the exception form', () => {
  test('shows the weekday rule as a placeholder when empty, and follows the rule on request', async ({
    page,
  }) => {
    await saveOverride(FOLLOW_DAY, 2)
    await signInNewAdmin(page, 'pro-cap-follow')
    await openDay(page, FOLLOW_DAY)
    await expect(capacityInput(page)).toHaveValue('2')
    await page.getByRole('button', { name: AVAILABILITY.capacityField.followRule }).click()
    await expect(capacityInput(page)).toHaveValue('')
    await expect(capacityInput(page)).toBeFocused()
    await expect(capacityInput(page)).toHaveAttribute(
      'placeholder',
      placeholderOf(ruleOf(FOLLOW_DAY)),
    )

    await openDay(page, EMPTY_DAY)
    await expect(capacityInput(page)).toHaveAttribute(
      'placeholder',
      placeholderOf(ruleOf(EMPTY_DAY)),
    )
  })

  test('has no placeholder on the weekday rule fields', async ({ page }) => {
    await signInNewAdmin(page, 'pro-cap-rules')
    await page.goto('/pro/availability')
    await page.waitForLoadState('networkidle')
    for (const weekday of WEEKDAYS_MONDAY_FIRST) {
      const field = page.getByRole('spinbutton', {
        name: capitalizeFirst(formatWeekday(weekday, 'fr-FR'), 'fr-FR'),
      })
      await expect(field).toBeVisible()
      expect(await field.getAttribute('placeholder')).toBeNull()
    }
  })

  test('starts from the rule value with the arrow keys and the buttons when empty', async ({
    page,
  }) => {
    const openRule = rules.find(
      rule => rule.maxBookings >= 1 && rule.maxBookings < PRO_DAY_CAPACITY_MAX,
    )
    expect(openRule).toBeDefined()
    const rule = (openRule as ProWeekdayRule).maxBookings
    const date = WEEKDAYS_MONDAY_FIRST.map(offset => addDaysToIsoDate(EMPTY_DAY, offset)).find(
      candidate => parseIsoDate(candidate).getDay() === (openRule as ProWeekdayRule).weekday,
    ) as string
    await signInNewAdmin(page, 'pro-cap-fallback')
    await openDay(page, date)
    const input = capacityInput(page)
    const followRule = page.getByRole('button', { name: AVAILABILITY.capacityField.followRule })
    const context = AVAILABILITY.override.capacityContext
    const steps: { name: string; act: () => Promise<void>; expected: number }[] = [
      { name: 'ArrowUp', act: () => input.press('ArrowUp'), expected: rule + 1 },
      { name: 'ArrowDown', act: () => input.press('ArrowDown'), expected: rule - 1 },
      {
        name: 'the + button',
        act: () =>
          page
            .getByRole('button', {
              name: AVAILABILITY.capacityField.increase.replace('{context}', context),
            })
            .click(),
        expected: rule + 1,
      },
      {
        name: 'the − button',
        act: () =>
          page
            .getByRole('button', {
              name: AVAILABILITY.capacityField.decrease.replace('{context}', context),
            })
            .click(),
        expected: rule - 1,
      },
    ]
    for (const step of steps) {
      await expect(input).toHaveValue('')
      await input.focus()
      await step.act()
      await expect(input, step.name).toHaveValue(String(step.expected))
      await followRule.click()
    }
  })

  test('removes the capacity of the exception when saved empty, and keeps its note', async ({
    page,
  }) => {
    await signInNewAdmin(page, 'pro-cap-save-empty')
    await openDay(page, SAVE_EMPTY_DAY)
    await capacityInput(page).fill('2')
    await noteField(page).fill('Garder la note')
    await page.getByRole('button', { name: AVAILABILITY.override.save }).click()
    await expect(
      status(page, AVAILABILITY.override.saved.replace('{date}', fullDate(SAVE_EMPTY_DAY))),
    ).toBeVisible()
    expect(await readOverride(SAVE_EMPTY_DAY)).toMatchObject({ max_bookings: 2 })

    await page.getByRole('button', { name: AVAILABILITY.capacityField.followRule }).click()
    await page.getByRole('button', { name: AVAILABILITY.override.save }).click()
    await expect
      .poll(async () => readOverride(SAVE_EMPTY_DAY), { timeout: 20_000 })
      .toMatchObject({ max_bookings: null, note: 'Garder la note' })
  })
})
