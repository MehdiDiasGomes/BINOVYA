import { expect, test, type Locator, type Page } from '@playwright/test'

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
import { historyLength, signInAdmin, waitForHydration } from '../support/pro'

const FROM = '2041-08-01'

const TO = '2041-08-31'

const FILTERS = frPro.list.filters

const LIST = `/pro/interventions?from=${FROM}&to=${TO}`

let customer: AccountCustomer

const statusSelect = (page: Page): Locator =>
  page.getByRole('combobox', { name: new RegExp(`^${FILTERS.status}`) })

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
})

test.afterAll(async () => {
  await cleanupE2eData()
  await removeE2eAdmins()
})

test('the status Select works with the keyboard, filters the list and adds no history entry', async ({
  page,
}) => {
  await signInAdmin(page)
  await page.goto(LIST)
  await waitForHydration(page)
  await expect(page.getByRole('article')).toHaveCount(4)
  const before = await historyLength(page)

  await statusSelect(page).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('listbox')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await expect(statusSelect(page)).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(page.getByRole('option', { name: FILTERS.statuses.all })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('option', { name: FILTERS.statuses.pending_payment })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('option', { name: FILTERS.statuses.paid })).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/status=paid/)
  await expect(page.getByRole('article')).toHaveCount(2)
  await expect(statusSelect(page)).toHaveAccessibleName(
    `${FILTERS.status} : ${FILTERS.statuses.paid}`,
  )
  expect(await historyLength(page)).toBe(before)
})
