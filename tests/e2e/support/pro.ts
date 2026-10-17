import { expect, type Page } from '@playwright/test'

import { PRO_CONFIRM_PATH, PRO_HOME_PATH } from '../../../app/constants/pro'
import { generateTokenHash, type AccountCustomer } from '../../support/account'
import { createAdmin } from '../../support/admin'
import { uniqueTestEmail } from '../../support/env'

import type { Lang } from './account'

/**
 * Builds the Pro confirm path of a fresh login link, as the mail carries it.
 * @param email - Email of the Auth user
 * @param lang - Language of the site
 * @returns Path with the token in the fragment
 */
export const proConfirmPath = async (email: string, lang: Lang = 'fr'): Promise<string> => {
  const tokenHash: string = await generateTokenHash(email)
  return `${lang === 'fr' ? '' : '/en'}${PRO_CONFIRM_PATH}#token_hash=${tokenHash}`
}

/**
 * Creates a test admin and opens its session in the browser through the confirm page.
 * @param page - Page of the test
 * @param tag - Short label put in the email
 * @returns The admin
 */
export const signInNewAdmin = async (page: Page, tag: string): Promise<AccountCustomer> => {
  const admin: AccountCustomer = await createAdmin(uniqueTestEmail(tag))
  await page.goto(await proConfirmPath(admin.email))
  await page.waitForURL(url => url.pathname === PRO_HOME_PATH)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  return admin
}

/**
 * Reads the number of entries of the history of the page.
 * @param page - Page of the test
 * @returns `history.length`
 */
export const historyLength = (page: Page): Promise<number> =>
  page.evaluate(() => window.history.length)
