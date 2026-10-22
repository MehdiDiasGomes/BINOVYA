import { readFileSync } from 'node:fs'

import { expect, type BrowserContextOptions, type Locator, type Page } from '@playwright/test'

import { PRO_CONFIRM_PATH, PRO_HOME_PATH } from '../../../app/constants/pro'
import { formatFullDate } from '../../../app/utils/date'
import SITE_FR from '../../../i18n/locales/fr'
import frPro from '../../../i18n/locales/fr/pro'
import { generateTokenHash } from '../../support/account'

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

export const ADMIN_STORAGE_STATE_PATH: string = 'tests/e2e/.auth/admin.json'

type StorageState = Exclude<NonNullable<BrowserContextOptions['storageState']>, string>

/**
 * Signs in the admin shared by the run (see `global-setup.ts`) by loading its stored cookies into
 * the page's context, then opens the Pro home page.
 * @param page - Page of the test
 */
export const signInAdmin = async (page: Page): Promise<void> => {
  const state = JSON.parse(readFileSync(ADMIN_STORAGE_STATE_PATH, 'utf8')) as StorageState
  await page.context().addCookies(state.cookies)
  await page.goto(PRO_HOME_PATH)
  await expect(page).toHaveURL(url => url.pathname === PRO_HOME_PATH)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await waitForHydration(page)
}

/**
 * Reads the number of entries of the history of the page.
 * @param page - Page of the test
 * @returns `history.length`
 */
export const historyLength = (page: Page): Promise<number> =>
  page.evaluate(() => window.history.length)

const MAX_MONTH_CLICKS: number = 16

/**
 * Picks a date in the calendar popover of a `DatePicker`, going forward month by month until the
 * day is on screen.
 * @param page - Page of the test
 * @param trigger - Button that opens the calendar
 * @param isoDate - ISO date to pick, from today to a year ahead
 */
export const pickCalendarDate = async (
  page: Page,
  trigger: Locator,
  isoDate: string,
): Promise<void> => {
  await trigger.click()
  const day: Locator = page
    .getByRole('button', { name: formatFullDate(isoDate, 'fr-FR'), exact: true })
    .or(page.getByRole('gridcell', { name: formatFullDate(isoDate, 'fr-FR'), exact: true }))
  for (let click = 0; click < MAX_MONTH_CLICKS && !(await day.first().isVisible()); click += 1) {
    await page.getByRole('button', { name: SITE_FR.common.datePicker.nextMonth }).click()
  }
  await day.first().click()
}

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Builds a pattern from a locale message: the text is matched literally, each `{param}` is
 * replaced by the given value, or by any text when none is given.
 * @param template - Locale message with `{param}` placeholders
 * @param values - Text of the parameters the test knows
 * @returns Case-sensitive pattern
 */
export const messagePattern = (template: string, values: Record<string, string> = {}): RegExp =>
  new RegExp(
    escapeRegExp(template).replace(/\\\{(\w+)\\\}/g, (_match: string, name: string) =>
      name in values ? escapeRegExp(values[name] ?? '') : '.+',
    ),
  )

const REQUEST_WAIT_MS: number = 15_000

export type DelayedRoute = {
  /** Lets the delayed answers through. */
  release: () => void
  /** Resolves once the page has sent a matching request. */
  requestSeen: Promise<void>
}

/**
 * Holds the answer of a route until `release` is called. By default the request really reaches
 * the server, only its answer is late; with `'fail'` the request never reaches the server and
 * the late answer is a 500.
 * @param page - Page of the test
 * @param url - Route pattern to intercept
 * @param mode - `'forward'` to let the server answer, `'fail'` to answer 500 without calling it
 * @returns The release function and a promise of the first matching request
 */
export const delayRoute = async (
  page: Page,
  url: string | RegExp,
  mode: 'forward' | 'fail' = 'forward',
): Promise<DelayedRoute> => {
  let release: () => void = () => undefined
  const gate: Promise<void> = new Promise<void>(resolve => {
    release = resolve
  })
  let markSeen: () => void = () => undefined
  const requestSeen: Promise<void> = new Promise<void>((resolve, reject) => {
    markSeen = resolve
    setTimeout(() => reject(new Error(`No request matched ${String(url)}`)), REQUEST_WAIT_MS)
  })
  await page.route(url, async route => {
    markSeen()
    if (mode === 'fail') {
      await gate
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 500 }),
      })
      return
    }
    const response = await route.fetch()
    await gate
    await route.fulfill({ response })
  })
  return { release, requestSeen }
}

export type AnnouncementRecord = {
  text: string
  hasHiddenAncestor: boolean
  hasOpenDialog: boolean
}

const ANNOUNCEMENT_KEY = '__announcementRecord'

/**
 * Records, in the page, the state of the page live region the first time its text contains a
 * needle: whether an `aria-hidden="true"` ancestor still hides it, and whether a dialog is still
 * in the DOM. Must be called before the action that produces the announcement.
 * @param page - Page of the test
 * @param needle - Text the announcement contains
 */
export const watchAnnouncement = (page: Page, needle: string): Promise<void> =>
  page.evaluate(
    ({ needle: expected, key }) => {
      const store = window as unknown as Record<string, AnnouncementRecord | undefined>
      new MutationObserver(() => {
        const region: Element | null = document.querySelector(
          'p[role="status"][aria-live="polite"]',
        )
        if (store[key] || !region?.textContent?.includes(expected)) {
          return
        }
        store[key] = {
          text: region.textContent,
          hasHiddenAncestor: region.closest('[aria-hidden="true"]') !== null,
          hasOpenDialog: document.querySelector('[role="dialog"]') !== null,
        }
      }).observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['aria-hidden'],
      })
    },
    { needle, key: ANNOUNCEMENT_KEY },
  )

/**
 * Reads the record `watchAnnouncement` took.
 * @param page - Page of the test
 * @returns The record, or undefined while the announcement has not appeared
 */
export const readAnnouncement = (page: Page): Promise<AnnouncementRecord | undefined> =>
  page.evaluate(
    key => (window as unknown as Record<string, AnnouncementRecord | undefined>)[key],
    ANNOUNCEMENT_KEY,
  )

/**
 * Waits until Nuxt has finished hydrating the page, so that a click is not lost on
 * server-rendered markup that has no handler yet.
 * @param page - Page of the test
 */
export const waitForHydration = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const root = document.querySelector('#__nuxt') as
      | (Element & {
          __vue_app__?: { config: { globalProperties: { $nuxt?: { isHydrating?: boolean } } } }
        })
      | null
    return root?.__vue_app__?.config.globalProperties.$nuxt?.isHydrating === false
  })
}

/**
 * Locates the "more actions" button of the first intervention card.
 * @param page - Page of the test
 * @returns Locator of the button
 */
export const moreActions = (page: Page): Locator =>
  page.getByRole('button', { name: new RegExp(`^${frPro.card.moreName.split('{subject}')[0]}`) })
