import { expect, test } from '@playwright/test'

import { formatWeekday } from '../../../app/utils/date'
import { capitalizeFirst } from '../../../app/utils/text'
import frPro from '../../../i18n/locales/fr/pro'
import { removeE2eAdmins } from '../../support/admin'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { readRules, restoreRules } from '../../support/pro'
import { signInAdmin } from '../support/pro'

import type { ProWeekdayRule } from '../../../app/types/proAvailability'

const AVAILABILITY = frPro.availability

let originalRules: ProWeekdayRule[] = []

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  originalRules = await readRules()
})

test.afterAll(async () => {
  await restoreRules(originalRules)
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
    await signInAdmin(page)
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
})
