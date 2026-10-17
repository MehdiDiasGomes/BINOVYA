import { expect, test } from '@playwright/test'

import { directionsUrl, roundDirectionsUrls } from '../../../app/utils/googleMaps'
import { telHref } from '../../../app/utils/phone'
import enAccount from '../../../i18n/locales/en/account'
import frAccount from '../../../i18n/locales/fr/account'
import frPro from '../../../i18n/locales/fr/pro'
import { createCustomer, seedAccountBooking, type AccountCustomer } from '../../support/account'
import { THIONVILLE_ADDRESS, UCKANGE_ADDRESS } from '../../support/address'
import { createAdmin, readDepot, removeE2eAdmins } from '../../support/admin'
import { assertTestStripeKey, cleanupE2eData } from '../../support/db'
import { uniqueTestEmail } from '../../support/env'
import { findLink, waitForOneMail } from '../../support/outbox'
import { confirmPath } from '../support/account'
import { signInNewAdmin } from '../support/pro'

const DAY = '2041-08-05'

test.beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  await removeE2eAdmins()
})

test.afterAll(async () => {
  await cleanupE2eData()
  await removeE2eAdmins()
})

test.describe('admin journey', () => {
  test('requests a link on /pro/login, opens it from the mail and sees the day planning', async ({
    page,
  }) => {
    const admin = await createAdmin(uniqueTestEmail('pro-journey'))
    const first: AccountCustomer = await createCustomer({
      email: uniqueTestEmail('pro-j1'),
      firstName: 'Ada',
    })
    const second: AccountCustomer = await createCustomer({
      email: uniqueTestEmail('pro-j2'),
      firstName: 'Bob',
    })
    await seedAccountBooking({
      customerId: first.id,
      status: 'paid',
      scheduledDate: DAY,
      address: THIONVILLE_ADDRESS,
    })
    await seedAccountBooking({
      customerId: second.id,
      status: 'completed',
      scheduledDate: DAY,
      address: UCKANGE_ADDRESS,
    })
    const since = new Date()

    await page.goto('/pro/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel(frPro.login.email).fill(admin.email)
    await page.getByRole('button', { name: frPro.login.submit }).click()
    await expect(
      page.getByRole('heading', { level: 2, name: frPro.login.sent.title }),
    ).toBeVisible()

    const mail = await waitForOneMail({ to: admin.email, subjectIncludes: 'BINOVYA Pro', since })
    await page.goto(findLink(mail.html, '/pro/confirm') ?? '')
    await page.waitForURL(url => url.pathname === '/pro')
    expect(page.url()).not.toContain('token_hash')

    await page.goto(`/pro?date=${DAY}`)
    await expect(page.getByRole('article')).toHaveCount(2)
    const [paidCard, doneCard] = await page.getByRole('article').all()
    await expect(paidCard).toContainText(frPro.intervention.statuses.paid)
    await expect(paidCard).toContainText('Compte Ada')
    await expect(paidCard).toContainText(THIONVILLE_ADDRESS.label)
    await expect(paidCard.getByRole('link', { name: '+33612345678' })).toHaveAttribute(
      'href',
      telHref('+33612345678'),
    )
    await expect(
      paidCard.getByRole('link', { name: frPro.intervention.directions }),
    ).toHaveAttribute(
      'href',
      directionsUrl({ ...THIONVILLE_ADDRESS, address: THIONVILLE_ADDRESS.label }),
    )
    await expect(doneCard).toContainText(frPro.intervention.statuses.completed)
    await expect(doneCard).toContainText('Compte Bob')
    await expect(doneCard).toContainText(UCKANGE_ADDRESS.label)

    const depot = await readDepot()
    const [roundUrl] = roundDirectionsUrls(
      { latitude: depot.depot_latitude, longitude: depot.depot_longitude },
      [{ ...THIONVILLE_ADDRESS, address: THIONVILLE_ADDRESS.label }],
    )
    await expect(page.getByRole('link', { name: frPro.planning.round.link })).toHaveAttribute(
      'href',
      roundUrl ?? '',
    )
  })

  test('the planning of an empty day shows the empty states', async ({ page }) => {
    await signInNewAdmin(page, 'pro-empty')
    await page.goto('/pro?date=2041-08-06')
    await expect(page.getByText(frPro.planning.empty)).toBeVisible()
    await expect(page.getByText(frPro.planning.round.empty)).toBeVisible()
  })
})

test.describe('access rules in the browser', () => {
  test('a customer session on /pro goes to /pro/login with the denied notice', async ({ page }) => {
    const customer = await createCustomer({ email: uniqueTestEmail('pro-cust'), firstName: 'Ada' })
    await page.goto(await confirmPath(customer.email, 'fr'))
    await page.waitForURL(url => url.pathname === '/account')
    await page.goto('/pro')
    await page.waitForURL(url => url.pathname === '/pro/login')
    expect(new URL(page.url()).searchParams.get('access')).toBe('denied')
    await expect(page.getByText(frPro.login.accessDenied)).toBeVisible()
  })

  test('a visitor on /pro goes to /pro/login without the denied notice', async ({ page }) => {
    await page.goto('/pro')
    await page.waitForURL(url => url.pathname === '/pro/login')
    expect(new URL(page.url()).search).toBe('')
    await expect(page.getByText(frPro.login.accessDenied)).toHaveCount(0)
  })

  test('an admin on /login and /account is sent to /pro', async ({ page }) => {
    await signInNewAdmin(page, 'pro-redirect')
    await page.goto('/login')
    await page.waitForURL(url => url.pathname === '/pro')
    await page.goto('/account')
    await page.waitForURL(url => url.pathname === '/pro')
  })

  test('the navbar of the homepage shows "Espace admin" to /pro, "Admin area" in English', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await signInNewAdmin(page, 'pro-navbar')
    await page.goto('/')
    const link = page.getByRole('link', { name: frAccount.navAdmin })
    await expect(link).toHaveAttribute('href', '/pro')
    await link.click()
    await page.waitForURL(url => url.pathname === '/pro')

    await page.goto('/en')
    await expect(page.getByRole('link', { name: enAccount.navAdmin })).toHaveAttribute(
      'href',
      '/en/pro',
    )
    await expect(page.getByRole('link', { name: frAccount.nav })).toHaveCount(0)
  })
})
