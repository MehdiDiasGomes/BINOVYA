import { expect, test, type Locator, type Page } from '@playwright/test'

import { formatFullDate, formatWeekday } from '../../../app/utils/date'
import { capitalizeFirst } from '../../../app/utils/text'
import frBooking from '../../../i18n/locales/fr/booking'
import frPro from '../../../i18n/locales/fr/pro'
import { createCustomer, seedAccountBooking } from '../../support/account'
import { removeE2eAdmins } from '../../support/admin'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { uniqueTestEmail } from '../../support/env'
import {
  FAR_RANGES,
  farDates,
  readOverride,
  readRules,
  removeOverrides,
  restoreRules,
  saveOverride,
} from '../../support/pro'
import { messagePattern, pluralForm, signInNewAdmin } from '../support/pro'

import type { ProWeekdayRule } from '../../../app/types/proAvailability'

const DATES: string[] = farDates(FAR_RANGES.e2eAvailability)

const [BLOCKED_DAY, SECTOR_DAY, LUXEMBOURG_DAY, SHRUNK_DAY] = DATES as [
  string,
  string,
  string,
  string,
]

const AVAILABILITY = frPro.availability

const toMoveBadge = (page: Page): Locator =>
  page.getByRole('paragraph').filter({ hasText: frPro.intervention.toMoveReason })

let customerId = ''
let originalRules: ProWeekdayRule[] = []

const seedPaid = (date: string): Promise<string> =>
  seedAccountBooking({ customerId, status: 'paid', scheduledDate: date })

const setDayCapacity = async (page: Page, value: string): Promise<void> => {
  const capacity = page.getByRole('spinbutton', { name: AVAILABILITY.override.capacity })
  await capacity.fill(value)
  await capacity.press('Tab')
}

const saveException = async (page: Page, date: string): Promise<void> => {
  await page.getByRole('button', { name: AVAILABILITY.override.save }).click()
  await expect(
    page.getByRole('status').filter({
      hasText: AVAILABILITY.override.saved.replace('{date}', formatFullDate(date, 'fr-FR')),
    }),
  ).toBeVisible()
}

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  await removeOverrides(DATES)
  originalRules = await readRules()
  customerId = (await createCustomer({ email: uniqueTestEmail('e2e-avail'), firstName: 'Dispo' }))
    .id
})

test.afterAll(async () => {
  await restoreRules(originalRules)
  await removeOverrides(DATES)
  await cleanupE2eData()
  await removeE2eAdmins()
})

test.describe('availability page', () => {
  test('lowers the capacity of an open weekday with the keyboard and saves it', async ({
    page,
  }) => {
    const open = originalRules.find(rule => rule.maxBookings > 0)
    expect(open).toBeDefined()
    const { weekday, maxBookings } = open as ProWeekdayRule
    await signInNewAdmin(page, 'pro-avail-rules')
    await page.goto('/pro/availability')
    await page.waitForLoadState('networkidle')

    const field = page.getByRole('spinbutton', {
      name: capitalizeFirst(formatWeekday(weekday, 'fr-FR'), 'fr-FR'),
    })
    await expect(field).toHaveValue(String(maxBookings))
    await field.focus()
    await page.keyboard.press('ArrowDown')
    await expect(field).toHaveValue(String(maxBookings - 1))
    await page.getByRole('button', { name: AVAILABILITY.rules.save }).click()
    await expect(
      page.getByRole('status').filter({ hasText: AVAILABILITY.rules.saved }),
    ).toBeVisible()

    const stored = (await readRules()).find(rule => rule.weekday === weekday)
    expect(stored?.maxBookings).toBe(maxBookings - 1)
    await restoreRules(originalRules)
  })

  test('blocks a day with a paid booking: the status panel and the « À déplacer » badge follow, then the exception is removed', async ({
    page,
  }) => {
    await saveOverride(BLOCKED_DAY, 3)
    await seedPaid(BLOCKED_DAY)
    await signInNewAdmin(page, 'pro-avail-block')
    await page.goto(`/pro/availability?date=${BLOCKED_DAY}`)
    await page.waitForLoadState('networkidle')

    await setDayCapacity(page, '0')
    await expect(
      page
        .getByRole('region', { name: AVAILABILITY.override.title })
        .getByText(AVAILABILITY.capacityField.closed),
    ).toBeVisible()
    await saveException(page, BLOCKED_DAY)
    expect((await readOverride(BLOCKED_DAY))?.max_bookings).toBe(0)

    await page.goto(`/pro?date=${BLOCKED_DAY}`)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', {
        level: 3,
        name: messagePattern(pluralForm(frPro.dayStatus.title.closedWithBookings, 0)),
      }),
    ).toBeVisible()
    await expect(toMoveBadge(page)).toBeVisible()
    await expect(page.getByRole('link', { name: frPro.dayStatus.reopen })).toBeVisible()

    await page.goto(`/pro/interventions?from=${BLOCKED_DAY}&to=${BLOCKED_DAY}`)
    await page.waitForLoadState('networkidle')
    await expect(toMoveBadge(page)).toBeVisible()

    await page.goto(`/pro/availability?date=${BLOCKED_DAY}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: AVAILABILITY.override.remove }).click()
    await expect(
      page.getByRole('status').filter({
        hasText: messagePattern(AVAILABILITY.override.removed, {
          date: formatFullDate(BLOCKED_DAY, 'fr-FR'),
        }),
      }),
    ).toBeVisible()
    expect(await readOverride(BLOCKED_DAY)).toBeNull()
  })

  test('shrinks a day below its bookings: the panel warns about the capacity and no booking is flagged', async ({
    page,
  }) => {
    await saveOverride(SHRUNK_DAY, 3)
    await seedPaid(SHRUNK_DAY)
    await seedPaid(SHRUNK_DAY)
    await signInNewAdmin(page, 'pro-avail-shrink')
    await page.goto(`/pro/availability?date=${SHRUNK_DAY}`)
    await page.waitForLoadState('networkidle')
    await setDayCapacity(page, '1')
    await saveException(page, SHRUNK_DAY)

    await page.goto(`/pro?date=${SHRUNK_DAY}`)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', {
        level: 3,
        name: messagePattern(pluralForm(frPro.dayStatus.title.overCapacity, 0), {
          bookings: '2',
        }),
      }),
    ).toBeVisible()
    await expect(toMoveBadge(page)).toHaveCount(0)
  })

  test('imposes a French commune, then removes the stored sector', async ({ page }) => {
    await signInNewAdmin(page, 'pro-avail-fr')
    await page.goto(`/pro/availability?date=${SECTOR_DAY}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('combobox', { name: AVAILABILITY.override.sector }).fill('Thionville')
    await page
      .getByRole('option', { name: /^Thionville \(\d{5}\)$/ })
      .first()
      .click()
    await saveException(page, SECTOR_DAY)
    expect((await readOverride(SECTOR_DAY))?.sector_label).toMatch(/^Thionville \(\d{5}\)$/)
    await expect(page.getByText(/^Thionville \(\d{5}\)$/).first()).toBeVisible()

    await page.getByRole('button', { name: AVAILABILITY.override.removeSector }).click()
    await expect(page.getByRole('combobox', { name: AVAILABILITY.override.sector })).toBeFocused()
    await page.getByRole('combobox', { name: AVAILABILITY.override.sector }).fill('Metz')
    await page
      .getByRole('option', { name: /^Metz \(\d{5}\)$/ })
      .first()
      .click()
    await saveException(page, SECTOR_DAY)
    expect((await readOverride(SECTOR_DAY))?.sector_label).toMatch(/^Metz \(\d{5}\)$/)
  })

  test('imposes a Luxembourg commune from the fixed list', async ({ page }) => {
    await signInNewAdmin(page, 'pro-avail-lu')
    await page.goto(`/pro/availability?date=${LUXEMBOURG_DAY}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('combobox', { name: frBooking.municipality.country }).click()
    await page.getByRole('option', { name: /Luxembourg/ }).click()
    await page.getByRole('combobox', { name: AVAILABILITY.override.sector }).fill('Dudel')
    await page.getByRole('option', { name: 'Dudelange (LU)' }).click()
    await saveException(page, LUXEMBOURG_DAY)
    expect(await readOverride(LUXEMBOURG_DAY)).toMatchObject({ sector_label: 'Dudelange (LU)' })
    await expect(page.getByText('Dudelange (LU)').first()).toBeVisible()
  })
})
