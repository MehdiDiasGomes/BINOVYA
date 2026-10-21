import { describe, expect, it } from 'vitest'

import {
  ACCOUNT_NAV_ICONS,
  ACCOUNT_NAV_LABEL_KEYS,
  ACCOUNT_NAV_PATHS,
} from '../../../app/constants/account'
import { PRO_HOME_PATH } from '../../../app/constants/pro'
import enAccount from '../../../i18n/locales/en/account'
import enPro from '../../../i18n/locales/en/pro'
import frAccount from '../../../i18n/locales/fr/account'
import frPro from '../../../i18n/locales/fr/pro'

import type { CustomerSessionStatus } from '../../../app/types/account'

const STATUSES: CustomerSessionStatus[] = ['none', 'expired', 'active', 'admin']

const resolve = (messages: Record<string, unknown>, key: string): unknown =>
  messages[key.replace('account.', '')]

describe('navbar link of the customer area', () => {
  it.each(['none', 'expired'] as const)('leads a %s session to /login', status => {
    expect(ACCOUNT_NAV_PATHS[status]).toBe('/login')
  })

  it('leads an active customer to /account', () => {
    expect(ACCOUNT_NAV_PATHS.active).toBe('/account')
  })

  it('leads an admin to BINOVYA Pro', () => {
    expect(ACCOUNT_NAV_PATHS.admin).toBe(PRO_HOME_PATH)
  })

  it('reads "Espace client" for everyone but the admin, "Espace admin" for the admin', () => {
    expect(resolve(frAccount, ACCOUNT_NAV_LABEL_KEYS.active)).toBe('Espace client')
    expect(resolve(frAccount, ACCOUNT_NAV_LABEL_KEYS.none)).toBe('Espace client')
    expect(resolve(frAccount, ACCOUNT_NAV_LABEL_KEYS.admin)).toBe('Espace admin')
  })

  it('reads "Customer area" for everyone but the admin, "Admin area" for the admin', () => {
    expect(resolve(enAccount, ACCOUNT_NAV_LABEL_KEYS.active)).toBe('Customer area')
    expect(resolve(enAccount, ACCOUNT_NAV_LABEL_KEYS.admin)).toBe('Admin area')
  })

  it('gives every status a path, a label and an icon', () => {
    for (const status of STATUSES) {
      expect(ACCOUNT_NAV_PATHS[status]).toBeTruthy()
      expect(ACCOUNT_NAV_LABEL_KEYS[status]).toBeTruthy()
      expect(ACCOUNT_NAV_ICONS[status]).toBeTruthy()
    }
  })

  it('uses a distinct icon for the admin link', () => {
    expect(ACCOUNT_NAV_ICONS.admin).not.toBe(ACCOUNT_NAV_ICONS.active)
  })
})

describe('footer of the Pro layout', () => {
  it('names the website links, the copyright with its year and the way back in both languages', () => {
    for (const footer of [frPro.footer, enPro.footer]) {
      expect(footer.navLabel).toBeTruthy()
      expect(footer.copyright).toContain('{year}')
      expect(footer.backToSite).toBeTruthy()
    }
    expect(enPro.footer.backToSite).toBe('Back to the website')
  })
})
