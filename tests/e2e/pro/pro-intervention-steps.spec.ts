import { expect, test, type Locator, type Page } from '@playwright/test'

import frPro from '../../../i18n/locales/fr/pro'
import { createCustomer, pngFixture, seedAccountBooking } from '../../support/account'
import { removeE2eAdmins } from '../../support/admin'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { uniqueTestEmail } from '../../support/env'
import { readBookingProgress } from '../../support/pro'
import { parisDateFromToday } from '../../support/seed'
import { messagePattern, signInAdmin, waitForHydration } from '../support/pro'

const STEPS = frPro.steps

const PHONE_LABEL = '+33 6 12 34 56 78'

const DB_WAIT_MS = 20_000

const LOAD_WAIT_MS = 20_000

let customerId = ''

const seedToday = (): Promise<string> =>
  seedAccountBooking({
    customerId,
    status: 'paid',
    scheduledDate: parisDateFromToday(0),
  })

const openIntervention = async (page: Page, bookingId: string): Promise<void> => {
  await signInAdmin(page)
  await page.goto(`/pro/interventions/${bookingId}`)
  await waitForHydration(page)
  await expect(page.getByRole('button', { name: STEPS.details.toggle })).toBeVisible({
    timeout: LOAD_WAIT_MS,
  })
}

const stepHeading = (page: Page, name: string): Locator =>
  page.getByRole('heading', { level: 2, name: new RegExp(`${name}$`) })

const stepper = (page: Page): Locator => page.getByRole('navigation', { name: STEPS.progressLabel })

const afterPhoto = (): { name: string; mimeType: string; buffer: Buffer } => ({
  name: 'after.png',
  mimeType: 'image/png',
  buffer: Buffer.from(pngFixture([40, 150, 90])),
})

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  const customer = await createCustomer({
    email: uniqueTestEmail('pro-steps'),
    firstName: 'Ada',
  })
  customerId = customer.id
})

test.afterAll(async () => {
  await cleanupE2eData()
  await removeE2eAdmins()
})

test.describe('intervention stepper', () => {
  test('walks the four steps: on site, skip with confirmation, photo, recap, finish without the missing photo', async ({
    page,
  }) => {
    const bookingId = await seedToday()
    await openIntervention(page, bookingId)

    await expect(page).toHaveURL(/step=1/)
    await expect(
      stepper(page).getByText(messagePattern(STEPS.counter, { current: '1', total: '4' })),
    ).toBeVisible()
    await expect(
      page.getByRole('link', {
        name: STEPS.directions.call.replace('{name}', 'Compte Ada').replace('{phone}', PHONE_LABEL),
      }),
    ).toHaveAttribute('href', 'tel:+33612345678')

    await page.getByRole('button', { name: STEPS.directions.arrived }).click()
    await expect(page).toHaveURL(/step=2/)
    await expect(stepHeading(page, STEPS.names.before)).toBeFocused()
    await expect(
      stepper(page).getByText(messagePattern(STEPS.counter, { current: '2', total: '4' })),
    ).toBeVisible()

    const skip = page.getByRole('button', { name: STEPS.skip })
    await skip.click()
    const confirmation = page.getByRole('group', { name: STEPS.photo.skipWarning })
    await expect(confirmation).toBeVisible()
    await expect(confirmation.getByText(STEPS.photo.skipWarning)).toBeFocused()

    await confirmation.getByRole('button', { name: STEPS.photo.skipCancel }).click()
    await expect(confirmation).toHaveCount(0)
    await expect(skip).toBeFocused()
    expect((await readBookingProgress(bookingId)).intervention_photos).toEqual([])

    await skip.click()
    await confirmation.getByRole('button', { name: STEPS.photo.skipConfirm }).click()
    await expect(page).toHaveURL(/step=3/)
    await expect(stepHeading(page, STEPS.names.after)).toBeFocused()

    await expect(page.getByText(STEPS.photo.text.after)).toBeVisible()
    await page.locator('input[type="file"]').setInputFiles(afterPhoto())
    await expect(
      page.getByRole('status').filter({ hasText: frPro.photos.saved.replace('{kind}', '').trim() }),
    ).toBeVisible({ timeout: DB_WAIT_MS })
    await expect
      .poll(async () => (await readBookingProgress(bookingId)).intervention_photos, {
        timeout: DB_WAIT_MS,
      })
      .toEqual([{ kind: 'after' }])

    await page.getByRole('button', { name: STEPS.next.after }).click()
    await expect(page).toHaveURL(/step=4/)
    await expect(stepHeading(page, STEPS.names.recap)).toBeFocused()
    await expect(
      page.getByText(
        messagePattern(STEPS.recap.missing, { missing: frPro.complete.missing.before }),
      ),
    ).toBeVisible()

    await page.getByRole('button', { name: frPro.complete.action }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: frPro.complete.force }).click()
    await expect(page.getByRole('heading', { level: 2, name: STEPS.completed.title })).toBeVisible({
      timeout: DB_WAIT_MS,
    })
    await expect(page.getByText(STEPS.completed.withoutPhotos)).toBeVisible()
    const progress = await readBookingProgress(bookingId)
    expect(progress.status).toBe('completed')
    expect(progress.completed_without_photos).toBe(true)
  })

  test('the segments of the stepper link back to a step already left', async ({ page }) => {
    const bookingId = await seedToday()
    await openIntervention(page, bookingId)
    await page.getByRole('button', { name: STEPS.directions.arrived }).click()
    await expect(page).toHaveURL(/step=2/)

    const directionsSegment = page.getByRole('link', {
      name: new RegExp(`${STEPS.names.directions} ${STEPS.states.done}$`),
    })
    await directionsSegment.click()
    await expect(page).toHaveURL(/step=1/)
    await expect(stepHeading(page, STEPS.names.directions)).toBeFocused()
  })
})

test.describe('intervention details accordion', () => {
  test('is closed by default, opens with the phone number and closes again', async ({ page }) => {
    const bookingId = await seedToday()
    await openIntervention(page, bookingId)

    const toggle = page.getByRole('button', { name: STEPS.details.toggle })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('link', { name: PHONE_LABEL, exact: true })).toHaveCount(0)

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('link', { name: PHONE_LABEL, exact: true })).toHaveAttribute(
      'href',
      'tel:+33612345678',
    )
    await expect(page.getByText(frPro.intervention.plan)).toBeVisible()

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('link', { name: PHONE_LABEL, exact: true })).toHaveCount(0)
  })
})
