import { expect, test, type Locator, type Page, type Response } from '@playwright/test'

import { formatFullDate } from '../../../app/utils/date'
import frPro from '../../../i18n/locales/fr/pro'
import { createCustomer, seedAccountBooking } from '../../support/account'
import { removeE2eAdmins } from '../../support/admin'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { uniqueTestEmail } from '../../support/env'
import { waitForOneMail } from '../../support/outbox'
import {
  FAR_RANGES,
  farDates,
  readBookingDate,
  removeOverrides,
  saveOverride,
} from '../../support/pro'
import {
  delayRoute,
  messagePattern,
  moreActions,
  pickCalendarDate,
  readAnnouncement,
  signInAdmin,
  watchAnnouncement,
} from '../support/pro'

const DATES: string[] = farDates(FAR_RANGES.e2eReschedule)

const [OK_DAY, FORCE_DAY, KEYBOARD_DAY, TARGET_DAY, CLOSED_DAY, ANNOUNCE_DAY, REDUCED_DAY] =
  DATES as [string, string, string, string, string, string, string]

const RESCHEDULE_ROUTE = /\/api\/pro\/bookings\/[^/]+\/reschedule$/

const DB_WAIT_MS = 20_000

const RESCHEDULE = frPro.reschedule

const seedBooking = async (tag: string, date: string): Promise<{ id: string; email: string }> => {
  const email = uniqueTestEmail(tag)
  const customer = await createCustomer({ email, firstName: 'Deplace' })
  const id = await seedAccountBooking({
    customerId: customer.id,
    status: 'paid',
    scheduledDate: date,
  })
  return { id, email }
}

const submitName = new RegExp(`^${RESCHEDULE.submit}`)

const successNeedle = (): string =>
  RESCHEDULE.success.split('{name}')[1]?.split('{date}')[0] ?? RESCHEDULE.success

const openDialog = async (page: Page, date: string): Promise<Locator> => {
  await page.goto(`/pro?date=${date}`)
  await page.waitForLoadState('networkidle')
  await moreActions(page).click()
  await page.getByRole('menuitem', { name: frPro.intervention.reschedule }).click()
  const dialog = page.getByRole('dialog', { name: RESCHEDULE.title })
  await expect(dialog).toBeVisible()
  return dialog
}

const dateField = (dialog: Locator): Locator =>
  dialog.getByRole('button', { name: new RegExp(RESCHEDULE.dateLabel) })

const pickInDialog = (page: Page, dialog: Locator, date: string): Promise<void> =>
  pickCalendarDate(page, dateField(dialog), date)

const listTitle = (page: Page): Locator =>
  page.getByRole('heading', { level: 2, name: frPro.planning.listTitle })

const submitAndWaitForAnswer = async (
  page: Page,
  dialog: Locator,
  name: string | RegExp,
): Promise<Response> => {
  const [response] = await Promise.all([
    page.waitForResponse(
      answer => RESCHEDULE_ROUTE.test(answer.url()) && answer.request().method() === 'POST',
    ),
    dialog.getByRole('button', { name }).click(),
  ])
  return response
}

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
  await removeOverrides(DATES)
  await saveOverride(TARGET_DAY, 5)
  await saveOverride(CLOSED_DAY, 0)
  await saveOverride(KEYBOARD_DAY, 5)
})

test.afterAll(async () => {
  await removeOverrides(DATES)
  await cleanupE2eData()
  await removeE2eAdmins()
})

test.describe('reschedule dialog', () => {
  test('refuses the same date, then moves the booking, announces it and mails the customer', async ({
    page,
  }) => {
    const booking = await seedBooking('e2e-resched-ok', OK_DAY)
    await signInAdmin(page)
    const dialog = await openDialog(page, OK_DAY)
    await dialog.getByRole('button', { name: RESCHEDULE.submit }).click()
    await expect(dialog.getByText(RESCHEDULE.errors.dateRequired)).toBeVisible()

    await pickInDialog(page, dialog, OK_DAY)
    await dialog.getByRole('button', { name: RESCHEDULE.submit }).click()
    await expect(dialog.getByRole('alert')).toHaveText(RESCHEDULE.errors.sameDate)
    await expect(dialog.getByRole('button', { name: RESCHEDULE.force })).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: RESCHEDULE.submit })).toBeFocused()

    await pickInDialog(page, dialog, TARGET_DAY)
    await expect(dialog.getByRole('alert')).toHaveCount(0)
    await dialog.getByRole('button', { name: RESCHEDULE.submit }).click()
    await expect(dialog).toBeHidden()

    await expect(page.getByRole('status').filter({ hasText: /Deplace/ })).toHaveText(
      messagePattern(RESCHEDULE.success, { date: formatFullDate(TARGET_DAY, 'fr-FR') }),
    )
    await expect(page.getByText(frPro.planning.empty)).toBeVisible()
    await expect(listTitle(page)).toBeFocused()
    expect((await readBookingDate(booking.id)).scheduled_date).toBe(TARGET_DAY)
    const mail = await waitForOneMail({ to: booking.email, subjectIncludes: 'déplacée' })
    expect(mail.subject).toContain(formatFullDate(TARGET_DAY, 'fr-FR'))
  })

  test('shows the refusal for a closed day, then moves the booking with « Forcer quand même »', async ({
    page,
  }) => {
    const booking = await seedBooking('e2e-resched-force', FORCE_DAY)
    await signInAdmin(page)
    const dialog = await openDialog(page, FORCE_DAY)

    await pickInDialog(page, dialog, CLOSED_DAY)
    const refused = await submitAndWaitForAnswer(page, dialog, RESCHEDULE.submit)
    expect(refused.status()).toBe(409)
    await expect(dialog.getByRole('alert')).toHaveText(RESCHEDULE.errors.dayClosed)
    expect((await readBookingDate(booking.id)).scheduled_date).toBe(FORCE_DAY)

    const forced = await submitAndWaitForAnswer(page, dialog, RESCHEDULE.force)
    expect(forced.status()).toBe(200)
    await expect(dialog).toBeHidden({ timeout: DB_WAIT_MS })
    await expect(page.getByRole('status').filter({ hasText: /Deplace/ })).toContainText(
      RESCHEDULE.forced.replace('{reasons}', RESCHEDULE.overridden.dayClosed),
    )
    expect((await readBookingDate(booking.id)).scheduled_date).toBe(CLOSED_DAY)
    await waitForOneMail({ to: booking.email, subjectIncludes: 'déplacée' })
  })

  test('opens from the keyboard, traps focus, closes with Escape and gives focus back', async ({
    page,
    browserName,
  }) => {
    const booking = await seedBooking('e2e-resched-kbd', KEYBOARD_DAY)
    await signInAdmin(page)
    await page.goto(`/pro?date=${KEYBOARD_DAY}`)
    await page.waitForLoadState('networkidle')
    const trigger = moreActions(page)
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menuitem', { name: frPro.intervention.reschedule })).toBeFocused()
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog', { name: RESCHEDULE.title })
    await expect(dialog).toBeVisible()
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true)

    const isWebKit: boolean = browserName === 'webkit'
    const cycleKeys: string[] = isWebKit ? ['Alt+Tab', 'Alt+Shift+Tab'] : ['Tab', 'Shift+Tab']
    for (const key of cycleKeys) {
      let focusedInDialog = 0
      for (let step = 0; step < 8; step += 1) {
        await page.keyboard.press(key)
        const inDialog: boolean = await dialog.evaluate(node =>
          node.contains(document.activeElement),
        )
        const onBody: boolean = await page.evaluate(() => document.activeElement === document.body)
        expect(inDialog || (isWebKit && onBody)).toBe(true)
        focusedInDialog += inDialog ? 1 : 0
      }
      expect(focusedInDialog).toBeGreaterThan(0)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    expect((await readBookingDate(booking.id)).scheduled_date).toBe(KEYBOARD_DAY)
  })
})

test.describe('reschedule dialog while the request is pending', () => {
  const MOTIONS = [
    { motion: 'no-preference', day: ANNOUNCE_DAY },
    { motion: 'reduce', day: REDUCED_DAY },
  ] as const

  for (const { motion, day } of MOTIONS) {
    test(`cannot be closed while submitting, then announces the move after the content unmounted, with reduced motion ${motion}`, async ({
      page,
    }) => {
      const booking = await seedBooking(`e2e-resched-live-${motion}`, day)
      await page.emulateMedia({ reducedMotion: motion })
      await signInAdmin(page)
      const dialog = await openDialog(page, day)
      await pickInDialog(page, dialog, TARGET_DAY)
      await watchAnnouncement(page, successNeedle())
      const delayed = await delayRoute(page, RESCHEDULE_ROUTE)
      await dialog.getByRole('button', { name: submitName }).click()
      await delayed.requestSeen
      await expect(dialog.getByRole('button', { name: RESCHEDULE.submitting })).toBeVisible()
      await expect(dialog.getByRole('button', { name: RESCHEDULE.cancel })).toHaveAttribute(
        'aria-disabled',
        'true',
      )
      await page.keyboard.press('Escape')
      await expect(dialog).toBeVisible()

      delayed.release()
      await expect(dialog).toBeHidden()
      await expect.poll(() => readAnnouncement(page)).toBeDefined()
      const record = await readAnnouncement(page)
      expect(record?.text).toContain(formatFullDate(TARGET_DAY, 'fr-FR'))
      expect(record?.hasHiddenAncestor).toBe(false)
      expect(record?.hasOpenDialog).toBe(false)
      expect((await readBookingDate(booking.id)).scheduled_date).toBe(TARGET_DAY)
    })
  }
})
