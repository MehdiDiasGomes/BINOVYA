import { expect, test, type Page } from '@playwright/test'

import SITE_FR from '../../../i18n/locales/fr'
import frPro from '../../../i18n/locales/fr/pro'
import { removeE2eAdmins } from '../../support/admin'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { FAR_RANGES, farDates } from '../../support/pro'
import { expectCalendarBelowField, signInAdmin } from '../support/pro'

const [FROM_DAY, TO_DAY] = farDates(FAR_RANGES.e2eDatePicker) as [string, string, ...string[]]

const FILTERS = frPro.list.filters

const MONTH_CHANGES = 6

const VIEWPORTS = [
  { name: 'a desktop', size: { width: 1280, height: 720 } },
  { name: 'a phone', size: { width: 375, height: 667 } },
]

const openList = async (page: Page, query: string = ''): Promise<void> => {
  await page.goto(`/pro/interventions${query}`)
  await page.waitForLoadState('networkidle')
}

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
})

test.afterAll(async () => {
  await cleanupE2eData()
  await removeE2eAdmins()
})

test.describe('DatePicker calendar', () => {
  for (const viewport of VIEWPORTS) {
    test(`opens below its field with six week rows on ${viewport.name}, month after month`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport.size)
      await signInAdmin(page)
      await openList(page)
      await expectCalendarBelowField(
        page,
        {
          trigger: page.getByRole('button', { name: new RegExp(`^${FILTERS.from} `) }),
          panel: page.getByRole('dialog', { name: FILTERS.from }),
        },
        MONTH_CHANGES,
      )
    })
  }
})

test.describe('DatePicker clear button', () => {
  test('centres its icon in the button', async ({ page }) => {
    await signInAdmin(page)
    await openList(page, `?from=${FROM_DAY}&to=${TO_DAY}`)
    const clear = page.getByRole('button', {
      name: SITE_FR.common.datePicker.clear.replace('{label}', FILTERS.from),
    })
    await expect(clear).toBeVisible()
    const button = await clear.boundingBox()
    const icon = await clear.locator('svg').boundingBox()
    expect(button).not.toBeNull()
    expect(icon).not.toBeNull()
    const centre = (
      box: { x: number; y: number; width: number; height: number } | null,
    ): { x: number; y: number } => ({
      x: (box?.x ?? 0) + (box?.width ?? 0) / 2,
      y: (box?.y ?? 0) + (box?.height ?? 0) / 2,
    })
    expect(Math.abs(centre(icon).x - centre(button).x)).toBeLessThanOrEqual(1)
    expect(Math.abs(centre(icon).y - centre(button).y)).toBeLessThanOrEqual(1)
  })
})
