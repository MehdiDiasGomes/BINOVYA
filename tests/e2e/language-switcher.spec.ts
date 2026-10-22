import { expect, test } from '@playwright/test'

import en from '../../i18n/locales/en'
import fr from '../../i18n/locales/fr'
import { ORIGIN } from '../support/env'
import { waitForHydration } from './support/pro'

const I18N_COOKIE = 'i18n_redirected'

test.describe('language switcher', () => {
  test('desktop: switches /contact to /en/contact, titles in English, remembers the choice', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/contact')
    await waitForHydration(page)
    await expect(page).toHaveTitle(fr.seo.contact.title)

    const switcher = page.getByRole('navigation', { name: fr.common.language })
    await expect(switcher.getByRole('link', { name: 'Français' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await switcher.getByRole('link', { name: 'English' }).click()

    await page.waitForURL(url => url.pathname === '/en/contact')
    await expect(page).toHaveTitle(en.seo.contact.title)
    const cookies = await context.cookies(ORIGIN)
    expect(cookies.find(cookie => cookie.name === I18N_COOKIE)?.value).toBe('en')

    await page.goto('/')
    await page.waitForURL(url => url.pathname === '/en')
  })

  test('mobile: picking a language navigates and closes the menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/contact')
    await waitForHydration(page)
    const toggle = page.getByRole('button', { name: fr.nav.menu })
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await page
      .getByRole('navigation', { name: fr.common.language })
      .getByRole('link', { name: 'English' })
      .click()

    await page.waitForURL(url => url.pathname === '/en/contact')
    await expect(page).toHaveTitle(en.seo.contact.title)
    await expect(page.getByRole('button', { name: en.nav.menu })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
