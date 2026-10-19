import { expect, test } from '@playwright/test'

import { addDaysToIsoDate, formatFullDate, formatMediumDate } from '../../../app/utils/date'
import frPro from '../../../i18n/locales/fr/pro'
import { removeE2eAdmins } from '../../support/admin'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { parisDateFromToday } from '../../support/seed'
import { historyLength, signInNewAdmin } from '../support/pro'

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
})

test.afterAll(async () => {
  await cleanupE2eData()
  await removeE2eAdmins()
})

test.describe('planning date row', () => {
  test('moves day by day with replace, keeps the itinerary block in place and disables "Aujourd’hui" on today', async ({
    page,
  }) => {
    const today = parisDateFromToday(0)
    const tomorrow = addDaysToIsoDate(today, 1)
    await signInNewAdmin(page, 'pro-date-row')
    await page.waitForLoadState('networkidle')
    const todayButton = page.getByRole('button', { name: frPro.planning.today })
    await expect(todayButton).toHaveAttribute('aria-disabled', 'true')
    await expect(
      page.getByRole('button', {
        name: `${frPro.planning.dateLabel} ${formatMediumDate(today, 'fr-FR')}`,
      }),
    ).toBeVisible()

    const round = page.getByRole('heading', { level: 2, name: frPro.planning.round.title })
    await expect(round).toBeVisible()
    const top = (await round.boundingBox())?.y
    const before = await historyLength(page)

    await page.getByRole('button', { name: frPro.planning.nextDay }).click()
    await expect(page).toHaveURL(new RegExp(`date=${tomorrow}`))
    await expect(round).toBeVisible()
    expect((await round.boundingBox())?.y).toBe(top)
    await expect(todayButton).not.toHaveAttribute('aria-disabled')
    expect(await historyLength(page)).toBe(before)

    await todayButton.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(`date=${today}`))
    await expect(todayButton).toBeFocused()
    await expect(todayButton).toHaveAttribute('aria-disabled', 'true')

    await page.getByRole('button', { name: frPro.planning.previousDay }).click()
    await expect(page).toHaveURL(new RegExp(`date=${addDaysToIsoDate(today, -1)}`))
  })

  test('a date picked in the calendar changes the planning day', async ({ page }) => {
    const today = parisDateFromToday(0)
    await signInNewAdmin(page, 'pro-date-pick')
    await page.waitForLoadState('networkidle')
    await page
      .getByRole('button', {
        name: `${frPro.planning.dateLabel} ${formatMediumDate(today, 'fr-FR')}`,
      })
      .click()
    await expect(page.getByRole('dialog', { name: frPro.planning.dateLabel })).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(`date=${addDaysToIsoDate(today, 1)}`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      frPro.planning.title.replace('{date}', formatFullDate(addDaysToIsoDate(today, 1), 'fr-FR')),
    )
  })
})
