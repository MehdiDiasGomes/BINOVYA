import { expect, type Locator, type Page, type ViewportSize } from '@playwright/test'

import enBooking from '../../../i18n/locales/en/booking'
import frBooking from '../../../i18n/locales/fr/booking'

export type Lang = 'fr' | 'en'

export const MESSAGES = { fr: frBooking, en: enBooking }

export const STRIPE_BACK_LINK = /Retour à|Return to|Back to/

export const bookingPath = (lang: Lang): string => (lang === 'fr' ? '/booking' : '/en/booking')

const monthOf = (isoDate: string): string => isoDate.slice(0, 7)

const SEARCH_QUERY = '12 rue de la Gare Thionville'

export const fillContactAndAddress = async (
  page: Page,
  lang: Lang,
  email: string,
): Promise<void> => {
  const m = MESSAGES[lang]
  await page.getByLabel(m.contact.firstName).fill('E2E')
  await page.getByLabel(m.contact.lastName, { exact: true }).fill('Payment')
  await page.getByLabel(m.contact.email).fill(email)
  await page.getByLabel(m.contact.phone).fill('6 12 34 56 78')
  await page.getByRole('combobox', { name: m.address.label }).fill(SEARCH_QUERY)
  await page.getByRole('option').first().click()
  await expect(page.getByText(/Thionville/).first()).toBeVisible()
  await page.waitForResponse(/\/api\/booking\/availability/).catch(() => null)
}

export const goNext = async (page: Page, lang: Lang): Promise<void> => {
  await page.getByRole('button', { name: MESSAGES[lang].actions.continue }).click()
}

export const fillBins = async (page: Page, lang: Lang): Promise<void> => {
  const m = MESSAGES[lang]
  await page
    .getByRole('button', {
      name: m.bins.increase.replace('{service}', m.bins.small.title),
    })
    .click()
  for (const legend of [m.collection.household.legend, m.collection.recycling.legend]) {
    await page.getByRole('group', { name: legend }).getByLabel(m.collection.unknown).check()
  }
}

export const pickDate = async (page: Page, isoDate: string): Promise<void> => {
  const cell: Locator = page.locator(
    `[data-reka-calendar-cell-trigger][data-value="${isoDate}"]:not([data-outside-view])`,
  )
  for (let attempt = 0; attempt < 4 && !(await cell.count()); attempt += 1) {
    await page.getByRole('button', { name: /Mois suivant|Next month/ }).click()
  }
  await cell.click()
  await expect(cell).toHaveAttribute('data-selected', 'true')
}

export type BookingInput = { email: string; isoDate: string }

export const fillUntilPayment = async (
  page: Page,
  lang: Lang,
  { email, isoDate }: BookingInput,
): Promise<void> => {
  await page.goto(bookingPath(lang))
  await page.waitForLoadState('networkidle')
  await fillContactAndAddress(page, lang, email)
  await goNext(page, lang)
  await fillBins(page, lang)
  await goNext(page, lang)
  await pickDate(page, isoDate)
  await goNext(page, lang)
  await expect(
    page.getByRole('heading', { name: MESSAGES[lang].headings.payment.title }),
  ).toBeVisible()
}

export const acceptPaymentCheckboxes = async (page: Page, lang: Lang): Promise<void> => {
  const m = MESSAGES[lang]
  for (const label of [m.payment.binsReady, m.payment.terms]) {
    await page.getByLabel(label).check()
  }
}

export const clickPay = async (page: Page, lang: Lang): Promise<void> => {
  await page
    .getByRole('button', { name: new RegExp(`^${MESSAGES[lang].actions.pay.split(' ')[0]}`) })
    .click()
}

export const payButton = (page: Page, lang: Lang): Locator =>
  page.getByRole('button', {
    name: new RegExp(
      `^(${MESSAGES[lang].actions.pay.split(' ')[0]}|${MESSAGES[lang].actions.submitting})`,
    ),
  })

export const goToStripe = async (page: Page, lang: Lang): Promise<void> => {
  await clickPay(page, lang)
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 })
}

export const restoreViewport = async (page: Page): Promise<void> => {
  const size: ViewportSize | null = page.viewportSize()
  if (!size) {
    return
  }
  const isCollapsed = (): Promise<boolean> =>
    page.evaluate(() => window.innerWidth * window.innerHeight === 0)
  if (await isCollapsed()) {
    await page.setViewportSize({ width: size.width + 1, height: size.height })
    await page.setViewportSize(size)
  }
  await expect.poll(isCollapsed).toBe(false)
}

export const BILLING_ADDRESS = {
  line1: '12 rue de la Gare',
  postalCode: '57100',
  city: 'Thionville',
} as const

export const fillBillingAddressIfAsked = async (page: Page): Promise<boolean> => {
  const line1: Locator = page.locator('#billingAddressLine1')
  if ((await line1.count()) === 0) {
    return false
  }
  await page.locator('#billingCountry').selectOption('FR')
  await line1.fill(BILLING_ADDRESS.line1)
  await page.locator('#billingPostalCode').fill(BILLING_ADDRESS.postalCode)
  await page.locator('#billingLocality').fill(BILLING_ADDRESS.city)
  return true
}

export const payOnStripe = async (page: Page, card = '4242424242424242'): Promise<void> => {
  await fillCard(page, card)
  await fillBillingAddressIfAsked(page)
  await page.getByTestId('hosted-payment-submit-button').click()
}

export const fillCard = async (page: Page, card: string): Promise<void> => {
  await page.getByLabel(/Numéro de carte|Card number/).fill(card)
  await page.getByLabel(/Date d.expiration|Expiration/).fill('12 / 34')
  await page.getByRole('textbox', { name: /CVC/ }).fill('123')
  const holder: Locator = page.getByLabel(
    /Nom du titulaire|Cardholder name|Nom sur la carte|Name on card/,
  )
  if (await holder.count()) {
    await holder.fill('E2E Payment')
  }
}

export { monthOf }
