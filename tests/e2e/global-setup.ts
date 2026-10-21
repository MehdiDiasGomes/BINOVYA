import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'

import { ADMIN_STORAGE_STATE_PATH, proConfirmPath } from './support/pro'
import { PRO_HOME_PATH } from '../../app/constants/pro'
import { createAdmin, removeE2eAdmins, SHARED_ADMIN_EMAIL } from '../support/admin'
import { BASE_URL } from '../support/env'

const WARM_UP_PATHS: string[] = [
  '/',
  '/booking',
  '/en/booking',
  '/login',
  '/account/confirm',
  '/booking?checkout=success',
  '/booking?checkout=cancelled',
  '/contact',
  '/quote',
  '/pro/login',
  '/pro/confirm',
  '/pro',
  '/pro/interventions',
]

const WARM_UP_TIMEOUT_MS = 90_000

const SIGN_IN_TIMEOUT_MS = 30_000

/**
 * Visits every page the specs use so the dev server compiles and optimizes them before the first
 * test, which avoids a Vite reload in the middle of a journey.
 * Then signs in the admin shared by the whole run and stores its session, so that no test has
 * to go through a login link of its own.
 * @returns Resolves once every page is warm and the shared session is stored
 */
const globalSetup = async (): Promise<void> => {
  const browser: Browser = await chromium.launch()
  const context: BrowserContext = await browser.newContext({ baseURL: BASE_URL, locale: 'fr-FR' })
  const page: Page = await context.newPage()
  try {
    for (const path of WARM_UP_PATHS) {
      await page.goto(path, { waitUntil: 'networkidle', timeout: WARM_UP_TIMEOUT_MS })
    }
    await removeE2eAdmins({ includeShared: true })
    await createAdmin(SHARED_ADMIN_EMAIL)
    await page.goto(await proConfirmPath(SHARED_ADMIN_EMAIL))
    await page.waitForURL(url => url.pathname === PRO_HOME_PATH, { timeout: SIGN_IN_TIMEOUT_MS })
    await context.storageState({ path: ADMIN_STORAGE_STATE_PATH })
  } finally {
    await browser.close()
  }
}

export default globalSetup
