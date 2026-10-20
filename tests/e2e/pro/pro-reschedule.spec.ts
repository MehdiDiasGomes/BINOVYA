import { expect, test, type Locator, type Page, type Response } from '@playwright/test'

import { PRO_RESCHEDULE_TIMEOUT_MS } from '../../../app/constants/pro'
import { formatFullDate } from '../../../app/utils/date'
import frPro from '../../../i18n/locales/fr/pro'
import { createCustomer, seedAccountBooking } from '../../support/account'
import { removeE2eAdmins } from '../../support/admin'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { uniqueTestEmail } from '../../support/env'
import { mailsAfterSettling, waitForOneMail } from '../../support/outbox'
import {
  FAR_RANGES,
  farDates,
  readBookingDate,
  removeOverrides,
  saveOverride,
} from '../../support/pro'
import {
  delayRoute,
  expectCalendarBelowField,
  messagePattern,
  pickCalendarDate,
  readAnnouncement,
  signInAdmin,
  watchAnnouncement,
} from '../support/pro'

const DATES: string[] = farDates(FAR_RANGES.e2eReschedule)

const [
  OK_DAY,
  FORCE_DAY,
  FOCUS_DAY,
  BLOCKED_DAY,
  TIMEOUT_DAY,
  ANNOUNCE_DAY,
  MOBILE_DAY,
  KEYBOARD_DAY,
  TARGET_DAY,
  CLOSED_DAY,
] = DATES as [string, string, string, string, string, string, string, string, string, string]

const RESCHEDULE_ROUTE = /\/api\/pro\/bookings\/[^/]+\/reschedule$/

const MOBILE = { width: 375, height: 667 }

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

const moreActions = (page: Page): Locator =>
  page.getByRole('button', { name: new RegExp(`^${frPro.card.moreName.split('{subject}')[0]}`) })

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

const successNeedle = (): string =>
  RESCHEDULE.success.split('{name}')[1]?.split('{date}')[0] ?? RESCHEDULE.success

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

    for (let step = 0; step < 8; step += 1) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true)
    }
    for (let step = 0; step < 8; step += 1) {
      await page.keyboard.press('Shift+Tab')
      expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    expect((await readBookingDate(booking.id)).scheduled_date).toBe(KEYBOARD_DAY)
  })

  test('puts focus on the new date field when the dialog opens', async ({ page }) => {
    await seedBooking('e2e-resched-focus', FOCUS_DAY)
    await signInAdmin(page)
    const dialog = await openDialog(page, FOCUS_DAY)
    await expect(dateField(dialog)).toBeFocused()
  })
})

test.describe('reschedule dialog while the request is pending', () => {
  test('cannot be closed while submitting, then closes when the move succeeds', async ({
    page,
  }) => {
    const booking = await seedBooking('e2e-resched-block', BLOCKED_DAY)
    await signInAdmin(page)
    const dialog = await openDialog(page, BLOCKED_DAY)
    await pickInDialog(page, dialog, TARGET_DAY)
    const delayed = await delayRoute(page, RESCHEDULE_ROUTE)
    await dialog.getByRole('button', { name: submitName }).click()
    await delayed.requestSeen
    await expect(dialog.getByRole('button', { name: RESCHEDULE.submitting })).toBeVisible()

    const close = dialog.getByRole('button', { name: RESCHEDULE.close })
    const cancel = dialog.getByRole('button', { name: RESCHEDULE.cancel })
    await expect(close).toHaveAttribute('aria-disabled', 'true')
    await expect(cancel).toHaveAttribute('aria-disabled', 'true')

    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    await page.mouse.click(4, 4)
    await expect(dialog).toBeVisible()
    await close.click({ force: true })
    await expect(dialog).toBeVisible()
    await cancel.click({ force: true })
    await expect(dialog).toBeVisible()
    await close.focus()
    await expect(close).toBeFocused()
    await cancel.focus()
    await expect(cancel).toBeFocused()

    delayed.release()
    await expect(dialog).toBeHidden({ timeout: DB_WAIT_MS })
    expect((await readBookingDate(booking.id)).scheduled_date).toBe(TARGET_DAY)
  })

  for (const motion of ['no-preference', 'reduce'] as const) {
    test(`announces the move after the dialog content unmounted, with reduced motion ${motion}`, async ({
      page,
    }) => {
      await seedBooking(`e2e-resched-live-${motion}`, ANNOUNCE_DAY)
      await page.emulateMedia({ reducedMotion: motion })
      await signInAdmin(page)
      const dialog = await openDialog(page, ANNOUNCE_DAY)
      await pickInDialog(page, dialog, TARGET_DAY)
      await watchAnnouncement(page, successNeedle())
      await dialog.getByRole('button', { name: submitName }).click()
      await expect(dialog).toBeHidden()
      await expect.poll(() => readAnnouncement(page), { timeout: DB_WAIT_MS }).toBeDefined()
      const record = await readAnnouncement(page)
      expect(record?.text).toContain(formatFullDate(TARGET_DAY, 'fr-FR'))
      expect(record?.hasHiddenAncestor).toBe(false)
      expect(record?.hasOpenDialog).toBe(false)
    })
  }

  test('tells a timeout apart, reloads the list when closed and refuses a retry with sameDate', async ({
    page,
  }) => {
    const booking = await seedBooking('e2e-resched-timeout', TIMEOUT_DAY)
    await page.clock.install()
    await signInAdmin(page)
    const dialog = await openDialog(page, TIMEOUT_DAY)
    await pickInDialog(page, dialog, TARGET_DAY)
    const delayed = await delayRoute(page, RESCHEDULE_ROUTE)
    await dialog.getByRole('button', { name: submitName }).click()
    await delayed.requestSeen
    await page.clock.fastForward(PRO_RESCHEDULE_TIMEOUT_MS)

    await expect(dialog.getByRole('alert')).toHaveText(RESCHEDULE.errors.timeout)
    await expect(dialog.getByRole('button', { name: RESCHEDULE.submit })).toBeFocused()
    await expect(dialog.getByRole('button', { name: RESCHEDULE.force })).toHaveCount(0)

    delayed.release()
    await expect
      .poll(async () => (await readBookingDate(booking.id)).scheduled_date, {
        timeout: DB_WAIT_MS,
      })
      .toBe(TARGET_DAY)
    const mail = await waitForOneMail({ to: booking.email, subjectIncludes: 'déplacée' })

    const retry = await submitAndWaitForAnswer(page, dialog, RESCHEDULE.submit)
    expect(retry.status()).toBe(422)
    await expect(dialog.getByRole('alert')).toHaveText(RESCHEDULE.errors.sameDate)
    const mails = await mailsAfterSettling({ to: booking.email, subjectIncludes: 'déplacée' })
    expect(mails.map(sent => sent.idempotencyKey)).toEqual([mail.idempotencyKey])

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(page.getByText(frPro.planning.empty)).toBeVisible()
    await expect(listTitle(page)).toBeFocused()
  })
})

test.describe('reschedule dialog on a phone', () => {
  test('is a tall sheet with the date field in its upper part and a calendar that opens below it', async ({
    page,
  }) => {
    await seedBooking('e2e-resched-phone', MOBILE_DAY)
    await page.setViewportSize(MOBILE)
    await signInAdmin(page)
    const dialog = await openDialog(page, MOBILE_DAY)
    await expect
      .poll(async () => {
        const field = await dateField(dialog).boundingBox()
        return (field?.y ?? MOBILE.height) + (field?.height ?? 0)
      })
      .toBeLessThan(MOBILE.height / 2)

    await expectCalendarBelowField(
      page,
      {
        trigger: dateField(dialog),
        panel: page.getByRole('dialog', { name: RESCHEDULE.dateLabel }),
      },
      5,
    )
  })
})
