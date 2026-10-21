import { expect, type Locator, type Page } from '@playwright/test'

import { pickCalendarDate, waitForHydration } from './pro'
import frBooking from '../../../i18n/locales/fr/booking'
import frPro from '../../../i18n/locales/fr/pro'

export const CREATE_PATH = '/pro/interventions/new'

export const CREATE = frPro.create

export type CreateFormInput = {
  email: string
  firstName?: string
  lastName?: string
  date: string
  mode?: 'payment_link' | 'offline'
  isQuote?: boolean
  quoteEuros?: string
  note?: string
}

const SEARCH_QUERY = '12 rue de la Gare Thionville'

export const dateTrigger = (page: Page): Locator =>
  page.getByRole('button', { name: new RegExp(`^${CREATE.date.label}`) })

export const submitButton = (page: Page, mode: 'payment_link' | 'offline'): Locator =>
  page.getByRole('button', { name: CREATE.submit[mode] })

export const binField = (page: Page, service: 'small' | 'large'): Locator =>
  page.getByRole('spinbutton', { name: frBooking.bins[service].title })

export const openCreateForm = async (page: Page, path: string = CREATE_PATH): Promise<void> => {
  await page.goto(path)
  await expect(page.getByRole('heading', { level: 1, name: CREATE.title })).toBeVisible()
  await waitForHydration(page)
}

export const fillCustomer = async (page: Page, input: CreateFormInput): Promise<void> => {
  await page.getByLabel(frBooking.contact.firstName).fill(input.firstName ?? 'Creee')
  await page.getByLabel(frBooking.contact.lastName, { exact: true }).fill(input.lastName ?? 'Admin')
  await page.getByLabel(frBooking.contact.email).fill(input.email)
  await page.getByLabel(frBooking.contact.phone).fill('6 12 34 56 78')
}

export const chooseAddress = async (page: Page): Promise<void> => {
  await page.getByRole('combobox', { name: frBooking.address.label }).fill(SEARCH_QUERY)
  await page.getByRole('option').first().click()
  await expect(page.getByRole('combobox', { name: frBooking.address.label })).toHaveValue(
    /Thionville/,
  )
}

export const addOneSmallBin = async (page: Page): Promise<void> => {
  await page
    .getByRole('button', {
      name: frBooking.bins.increase.replace('{service}', frBooking.bins.small.title),
    })
    .click()
  await expect(binField(page, 'small')).toHaveValue('1')
}

export const chooseMode = async (page: Page, mode: 'payment_link' | 'offline'): Promise<void> => {
  await page.getByText(CREATE.mode[mode].label, { exact: true }).click()
  await expect(page.getByRole('radio', { name: CREATE.mode[mode].label })).toBeChecked()
}

export const chooseGrid = async (page: Page): Promise<void> => {
  await page.getByText(CREATE.priceSource.grid.label, { exact: true }).click()
  await expect(page.getByRole('radio', { name: CREATE.priceSource.grid.label })).toBeChecked()
}

export const chooseQuote = async (page: Page): Promise<void> => {
  await page.getByText(CREATE.priceSource.quote.label, { exact: true }).click()
  await expect(page.getByRole('radio', { name: CREATE.priceSource.quote.label })).toBeChecked()
}

export const fillForm = async (page: Page, input: CreateFormInput): Promise<void> => {
  await fillCustomer(page, input)
  await chooseAddress(page)
  if (input.isQuote) {
    await chooseQuote(page)
    await page.getByLabel(CREATE.quoteAmount.label).fill(input.quoteEuros ?? '120,50')
  }
  await addOneSmallBin(page)
  await pickCalendarDate(page, dateTrigger(page), input.date)
  if (input.mode) {
    await chooseMode(page, input.mode)
  }
  if (input.note) {
    await page.getByLabel(CREATE.note.label).fill(input.note)
  }
}
