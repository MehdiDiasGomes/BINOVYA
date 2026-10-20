import { expect, test, type Locator, type Page } from '@playwright/test'

import { PRO_INTERVENTIONS_PAGE_SIZE } from '../../../app/constants/pro'
import { formatMediumDate } from '../../../app/utils/date'
import SITE_FR from '../../../i18n/locales/fr'
import frPro from '../../../i18n/locales/fr/pro'
import {
  createCustomer,
  seedAccountBookings,
  type AccountBookingSeed,
  type AccountCustomer,
} from '../../support/account'
import { removeE2eAdmins } from '../../support/admin'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { uniqueTestEmail } from '../../support/env'
import { historyLength, signInAdmin } from '../support/pro'

const FROM = '2041-08-01'

const TO = '2041-08-31'

const BULK_FROM = '2041-09-01'

const BULK_TO = '2041-09-30'

const BULK_COUNT = PRO_INTERVENTIONS_PAGE_SIZE + 1

const FILTERS = frPro.list.filters

const LIST = `/pro/interventions?from=${FROM}&to=${TO}`

let customer: AccountCustomer

const statusSelect = (page: Page): Locator =>
  page.getByRole('combobox', { name: new RegExp(`^${FILTERS.status}`) })

const dateTrigger = (page: Page, label: string, isoDate: string): Locator =>
  page.getByRole('button', { name: `${label} ${formatMediumDate(isoDate, 'fr-FR')}` })

const openList = async (page: Page, path: string): Promise<void> => {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  customer = await createCustomer({ email: uniqueTestEmail('pro-list'), firstName: 'Liste' })
  const statuses: AccountBookingSeed['status'][] = ['paid', 'paid', 'completed', 'cancelled']
  await seedAccountBookings(
    statuses.map((status, index) => ({
      customerId: customer.id,
      status,
      scheduledDate: `2041-08-${String(index + 10)}`,
    })),
  )
  await seedAccountBookings(
    Array.from({ length: BULK_COUNT }, () => ({
      customerId: customer.id,
      status: 'paid' as const,
      scheduledDate: BULK_FROM,
    })),
  )
})

test.afterAll(async () => {
  await cleanupE2eData()
  await removeE2eAdmins()
})

test.describe('status filter', () => {
  test('changing the status updates the URL with replace and the list', async ({ page }) => {
    await signInAdmin(page)
    await openList(page, LIST)
    await expect(page.getByRole('article')).toHaveCount(4)
    await expect(page.getByRole('heading', { level: 2, name: '4 interventions' })).toBeVisible()
    expect(page.getByRole('button', { name: /appliquer/i })).toHaveCount(0)
    const before = await historyLength(page)

    await statusSelect(page).click()
    await page.getByRole('option', { name: FILTERS.statuses.paid }).click()
    await expect(page).toHaveURL(/status=paid/)
    await expect(page.getByRole('article')).toHaveCount(2)
    await expect(statusSelect(page)).toHaveAccessibleName(
      `${FILTERS.status} : ${FILTERS.statuses.paid}`,
    )
    expect(await historyLength(page)).toBe(before)

    await statusSelect(page).click()
    await page.getByRole('option', { name: FILTERS.statuses.cancelled }).click()
    await expect(page).toHaveURL(/status=cancelled/)
    await expect(page.getByRole('article')).toHaveCount(1)
    await expect(page.getByRole('article').first()).toContainText(frPro.progress.cancelled)
    expect(await historyLength(page)).toBe(before)
  })

  test('the status Select works with the keyboard and Escape closes it', async ({ page }) => {
    await signInAdmin(page)
    await openList(page, LIST)
    await statusSelect(page).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('listbox')).toHaveCount(0)
    await expect(statusSelect(page)).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('listbox')).toBeVisible()
    await expect(page.getByRole('option', { name: FILTERS.statuses.all })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('option', { name: FILTERS.statuses.paid })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/status=paid/)
    await expect(page.getByRole('article')).toHaveCount(2)
  })

  test('"Réinitialiser" clears the filters', async ({ page }) => {
    await signInAdmin(page)
    await openList(page, `${LIST}&status=paid`)
    await expect(page.getByRole('article')).toHaveCount(2)
    await page.getByRole('button', { name: FILTERS.reset }).click()
    await expect(page).toHaveURL(url => url.search === '')
    await expect(statusSelect(page)).toHaveAccessibleName(
      `${FILTERS.status} : ${FILTERS.statuses.all}`,
    )
  })
})

test.describe('date filters', () => {
  test('a date picked by keyboard updates ?from=, closes the calendar and refocuses the trigger', async ({
    page,
  }) => {
    await signInAdmin(page)
    await openList(page, LIST)
    const trigger = dateTrigger(page, FILTERS.from, FROM)
    await expect(trigger).toBeVisible()
    const before = await historyLength(page)
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: FILTERS.from })
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('[data-selected]')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/from=2041-08-02/)
    await expect(dialog).toHaveCount(0)
    await expect(dateTrigger(page, FILTERS.from, '2041-08-02')).toBeFocused()
    expect(await historyLength(page)).toBe(before)
  })

  test('Escape closes the calendar and returns the focus to the trigger', async ({ page }) => {
    await signInAdmin(page)
    await openList(page, LIST)
    const trigger = dateTrigger(page, FILTERS.to, TO)
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: FILTERS.to })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await expect(page).toHaveURL(new RegExp(`to=${TO}`))
  })

  test('"Du" and "Au" are bounded by each other', async ({ page }) => {
    await signInAdmin(page)
    await openList(page, `${LIST.split('?')[0]}?from=2041-08-10&to=2041-08-20`)
    await dateTrigger(page, FILTERS.to, '2041-08-20').click()
    const dialog = page.getByRole('dialog', { name: FILTERS.to })
    await expect(dialog.getByRole('button', { name: /(^|\s)9 août 2041$/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await expect(
      dialog.getByRole('button', { name: /(^|\s)10 août 2041(,|$)/ }),
    ).not.toHaveAttribute('aria-disabled', 'true')
  })

  test('marks the days that hold a paid or completed intervention, with a legend', async ({
    page,
  }) => {
    await signInAdmin(page)
    await openList(page, LIST)
    await dateTrigger(page, FILTERS.from, FROM).click()
    const dialog = page.getByRole('dialog', { name: FILTERS.from })
    await expect(
      dialog.getByRole('button', { name: /10 août 2041, une intervention$/ }),
    ).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: /11 août 2041, une intervention$/ }),
    ).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: /12 août 2041, une intervention$/ }),
    ).toBeVisible()
    await expect(dialog.getByRole('button', { name: /(^|\s)13 août 2041$/ })).toBeVisible()
    await expect(dialog.getByRole('button', { name: /(^|\s)9 août 2041$/ })).toBeVisible()
    await expect(dialog.getByText(SITE_FR.common.datePicker.markedLegend)).toBeVisible()

    await dialog.getByRole('button', { name: SITE_FR.common.datePicker.previousMonth }).click()
    await expect(dialog.getByText(SITE_FR.common.datePicker.markedLegend)).toHaveCount(0)
  })

  test('a "Du" without date reads "Choisir une date"', async ({ page }) => {
    await signInAdmin(page)
    await openList(page, `/pro/interventions?from=&to=${TO}`)
    await expect(
      page.getByRole('button', {
        name: `${FILTERS.from} ${SITE_FR.common.datePicker.placeholder}`,
      }),
    ).toBeVisible()
  })
})

test.describe('pagination', () => {
  test('a page beyond the last one goes back to the last page with replace', async ({ page }) => {
    await signInAdmin(page)
    const before = await historyLength(page)
    await openList(page, `/pro/interventions?from=${BULK_FROM}&to=${BULK_TO}&page=99`)
    await expect(page).toHaveURL(/page=2/)
    await expect(
      page.getByRole('heading', { level: 2, name: `${BULK_COUNT} interventions, page 2 sur 2` }),
    ).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(BULK_COUNT - PRO_INTERVENTIONS_PAGE_SIZE)
    expect(await historyLength(page)).toBeLessThanOrEqual(before + 1)
  })

  test('the next page button pushes a history entry and focuses the results title', async ({
    page,
  }) => {
    await signInAdmin(page)
    await openList(page, `/pro/interventions?from=${BULK_FROM}&to=${BULK_TO}`)
    await expect(page.getByRole('article')).toHaveCount(PRO_INTERVENTIONS_PAGE_SIZE)
    const before = await historyLength(page)
    await page.getByRole('button', { name: frPro.list.pagination.next }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByRole('article')).toHaveCount(BULK_COUNT - PRO_INTERVENTIONS_PAGE_SIZE)
    expect(await historyLength(page)).toBe(before + 1)
    await expect(page.getByRole('heading', { level: 2, name: /page 2 sur 2/ })).toBeFocused()
  })
})
