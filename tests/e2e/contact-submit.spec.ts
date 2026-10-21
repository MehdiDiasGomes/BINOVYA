import { expect, test, type Page } from '@playwright/test'

import frBooking from '../../i18n/locales/fr/booking'
import frContact from '../../i18n/locales/fr/contact'
import { assertTestStripeKey, cleanupE2eData } from '../support/db'
import { uniqueTestEmail } from '../support/env'
import { delayRoute, waitForHydration } from './support/pro'

const CONTACT_ROUTE = /\/api\/contact$/

const fillContactForm = async (page: Page): Promise<void> => {
  await page.getByLabel(frBooking.contact.firstName, { exact: true }).fill('Ada')
  await page.getByLabel(frBooking.contact.lastName, { exact: true }).fill('Lovelace')
  await page
    .getByLabel(frBooking.contact.email, { exact: true })
    .fill(uniqueTestEmail('contact-busy'))
  await page.getByLabel(frBooking.contact.phone, { exact: true }).fill('06 12 34 56 78')
  await page.getByLabel(frContact.form.subject).selectOption({ label: frContact.subjects.info })
  await page.getByLabel(frContact.form.message).fill('Bonjour, une question sur vos formules.')
}

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
})

test.afterAll(async () => {
  await cleanupE2eData()
})

test.describe('contact form submit button', () => {
  test('is an aria-disabled, aria-busy submit button while sending, then shows the confirmation', async ({
    page,
  }) => {
    await page.goto('/contact')
    await waitForHydration(page)
    await fillContactForm(page)
    const delayed = await delayRoute(page, CONTACT_ROUTE)
    const submit = page.getByRole('button', { name: frContact.form.submit })
    await expect(submit).toHaveAttribute('type', 'submit')
    await expect(submit).not.toHaveAttribute('aria-disabled', 'true')
    await submit.click()
    await delayed.requestSeen

    const busy = page.getByRole('button', { name: frContact.form.submitting })
    await expect(busy).toHaveAttribute('aria-disabled', 'true')
    await expect(busy).toHaveAttribute('aria-busy', 'true')
    await expect(busy.locator('svg.animate-spin')).toHaveCount(1)

    delayed.release()
    await expect(page.getByRole('heading', { name: frContact.sent.title })).toBeVisible()
  })
})
