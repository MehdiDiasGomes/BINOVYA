import { expect, type Locator, type Page } from '@playwright/test'

import enBooking from '../../../i18n/locales/en/booking'
import frBooking from '../../../i18n/locales/fr/booking'

export type Lang = 'fr' | 'en'

export const MESSAGES = { fr: frBooking, en: enBooking }

export const newEmail = (tag: string): string =>
  `delivered+e2e-payment-${tag}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}@resend.dev`

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
  await page.getByLabel(m.payment.binsReady).check()
  await page.getByLabel(m.payment.terms).check()
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

export const payOnStripe = async (page: Page, card = '4242424242424242'): Promise<void> => {
  await fillCard(page, card)
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
