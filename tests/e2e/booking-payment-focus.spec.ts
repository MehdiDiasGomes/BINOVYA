import { expect, test, type Locator, type Page } from '@playwright/test'

import { fillUntilPayment, MESSAGES, type Lang } from './support/booking'
import { pickFreeDates } from '../support/dates'
import { uniqueTestEmail } from '../support/env'
import { requireValue } from '../support/require'

const MAX_TABS = 25

const FOCUS_OUTLINE_WIDTH = '3px'

const tabTo = async (page: Page, target: Locator, key: string): Promise<void> => {
  for (let tabs = 0; tabs < MAX_TABS; tabs += 1) {
    await page.keyboard.press(key)
    if (await target.evaluate(element => element === document.activeElement)) {
      return
    }
  }
  throw new Error(`Checkbox not reached in ${MAX_TABS} Tab presses`)
}

test('keyboard focus on the bins-ready checkbox stays below the header with a visible outline', async ({
  page,
  browserName,
}) => {
  const lang: Lang = 'fr'
  const days: string[] = await pickFreeDates(1)
  await fillUntilPayment(page, lang, {
    email: uniqueTestEmail('focus'),
    isoDate: requireValue(days[0], 'free day 0'),
  })
  const checkbox: Locator = page.getByLabel(MESSAGES[lang].payment.binsReady)
  await tabTo(page, checkbox, browserName === 'webkit' ? 'Alt+Tab' : 'Tab')
  await expect(checkbox).toBeFocused()

  const headerBox = requireValue(await page.locator('header').first().boundingBox(), 'header box')
  const checkboxBox = requireValue(await checkbox.boundingBox(), 'checkbox box')
  expect(checkboxBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height)
  await expect(checkbox).toBeInViewport()
  await expect(checkbox).toHaveCSS('outline-width', FOCUS_OUTLINE_WIDTH)
})
