import { expect, test } from '@playwright/test'

import { BOOKING_CHECKOUT_STORAGE_KEY } from '../../app/constants/booking'
import { signedAddress, THIONVILLE_ADDRESS } from '../support/address'
import { pickFreeDates } from '../support/dates'
import { assertTestStripeKey, cleanupE2eData, findBookings } from '../support/db'
import { uniqueTestEmail } from '../support/env'
import { requireValue } from '../support/require'
import { acceptPaymentCheckboxes, clickPay, MESSAGES } from './support/booking'

const m = MESSAGES.fr

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
})

test.afterAll(async () => {
  await cleanupE2eData()
})

test('a restored draft with a tampered address token sends the visitor back to the address field', async ({
  page,
}) => {
  const email = uniqueTestEmail('addrtoken')
  const date = requireValue((await pickFreeDates(1))[0], 'free day')
  const address = signedAddress(THIONVILLE_ADDRESS)
  const draft = {
    address: { ...address, token: `${address.token.slice(0, -2)}AA` },
    quantities: { 'small-bin': 1, 'large-bin': 0 },
    plan: 'one_off',
    collection: {
      household: { weekdays: [], isUnknown: true },
      recycling: { weekdays: [], isUnknown: true },
    },
    date,
    contact: {
      firstName: 'E2E',
      lastName: 'Token',
      email,
      phone: '612345678',
      phoneCountryCode: 'FR',
    },
    hasConfirmedBinsReady: true,
    hasAcceptedTerms: true,
  }
  await page.addInitScript(({ key, value }) => sessionStorage.setItem(key, value), {
    key: BOOKING_CHECKOUT_STORAGE_KEY,
    value: JSON.stringify({ bookingId: crypto.randomUUID(), draft }),
  })

  await page.goto('/booking?checkout=cancelled')
  await expect(page.getByRole('heading', { name: m.headings.payment.title })).toBeVisible()
  await acceptPaymentCheckboxes(page, 'fr')
  await clickPay(page, 'fr')

  const addressInput = page.getByRole('combobox', { name: m.address.label })
  await expect(page.getByRole('heading', { name: m.headings.contact.title })).toBeVisible()
  await expect(addressInput).toHaveValue('')
  await expect(addressInput).toHaveAttribute('aria-invalid', 'true')
  await expect(addressInput).toBeFocused()
  await expect(page.getByText(m.errors.invalidAddress)).toBeVisible()
  const describedBy = (await addressInput.getAttribute('aria-describedby')) ?? ''
  const errorTexts = await Promise.all(
    describedBy
      .split(' ')
      .filter(Boolean)
      .map(id => page.locator(`[id="${id}"]`).innerText()),
  )
  expect(errorTexts.join(' ')).toContain(m.errors.invalidAddress)
  expect(await findBookings(email)).toHaveLength(0)
})
