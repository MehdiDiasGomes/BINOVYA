import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'

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

/**
 * Visits every page the specs use so the dev server compiles and optimizes them before the first
 * test, which avoids a Vite reload in the middle of a journey.
 * @returns Resolves once every page is warm
 */
const globalSetup = async (): Promise<void> => {
  const browser: Browser = await chromium.launch()
  const context: BrowserContext = await browser.newContext({ baseURL: BASE_URL, locale: 'fr-FR' })
  const page: Page = await context.newPage()
  try {
    for (const path of WARM_UP_PATHS) {
      await page.goto(path, { waitUntil: 'networkidle', timeout: WARM_UP_TIMEOUT_MS })
    }
  } finally {
    await browser.close()
  }
}

export default globalSetup
