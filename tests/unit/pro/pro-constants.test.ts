import { describe, expect, it } from 'vitest'

import {
  ACCOUNT_NAV_ICONS,
  ACCOUNT_NAV_LABEL_KEYS,
  ACCOUNT_NAV_PATHS,
} from '../../../app/constants/account'
import {
  PRO_HOME_PATH,
  PRO_LIST_STATUSES,
  PRO_PLANNING_STATUSES,
  PRO_SKELETON_DATE_ROWS,
  PRO_SKELETON_DETAIL_ROWS,
  PRO_SKELETON_DETAIL_ROWS_WITH_DATE,
  PRO_STATUS_FILTERS,
} from '../../../app/constants/pro'
import enAccount from '../../../i18n/locales/en/account'
import frAccount from '../../../i18n/locales/fr/account'

import type { CustomerSessionStatus } from '../../../app/types/account'

const STATUSES: CustomerSessionStatus[] = ['none', 'active', 'expired', 'admin']

describe('ACCOUNT_NAV_LABEL_KEYS', () => {
  it.each(STATUSES)('has a label key for %s', status => {
    expect(ACCOUNT_NAV_LABEL_KEYS[status]).toMatch(/^account\.nav/)
  })

  it('labels the admin entry with its own key, translated in both languages', () => {
    expect(ACCOUNT_NAV_LABEL_KEYS.admin).toBe('account.navAdmin')
    expect(frAccount.navAdmin).toBe('Espace admin')
    expect(enAccount.navAdmin).toBe('Admin area')
  })

  it('keeps the customer label for the visitor and the expired session', () => {
    expect(ACCOUNT_NAV_LABEL_KEYS.none).toBe('account.nav')
    expect(ACCOUNT_NAV_LABEL_KEYS.expired).toBe('account.nav')
  })
})

describe('ACCOUNT_NAV_ICONS', () => {
  it.each(STATUSES)('has an icon for %s', status => {
    expect(ACCOUNT_NAV_ICONS[status].length).toBeGreaterThan(0)
  })

  it('uses LayoutDashboard for the admin', () => {
    expect(ACCOUNT_NAV_ICONS.admin).toBe('LayoutDashboard')
  })
})

describe('ACCOUNT_NAV_PATHS', () => {
  it.each(STATUSES)('has a path for %s', status => {
    expect(ACCOUNT_NAV_PATHS[status].startsWith('/')).toBe(true)
  })

  it('sends the admin to /pro', () => {
    expect(ACCOUNT_NAV_PATHS.admin).toBe(PRO_HOME_PATH)
  })
})

describe('status lists', () => {
  it('plans only paid and completed interventions', () => {
    expect(PRO_PLANNING_STATUSES).toEqual(['paid', 'completed'])
  })

  it('lists paid, completed and cancelled, never pending or expired', () => {
    expect(PRO_LIST_STATUSES).toEqual(['paid', 'completed', 'cancelled'])
  })

  it('offers "all" first, then every listed status', () => {
    expect(PRO_STATUS_FILTERS).toEqual(['all', ...PRO_LIST_STATUSES])
  })
})

describe('PRO_SKELETON constants', () => {
  it('are positive integers', () => {
    for (const value of [PRO_SKELETON_DETAIL_ROWS, PRO_SKELETON_DATE_ROWS]) {
      expect(Number.isInteger(value) && value > 0).toBe(true)
    }
  })

  it('add the date row to the detail rows', () => {
    expect(PRO_SKELETON_DETAIL_ROWS_WITH_DATE).toBe(
      PRO_SKELETON_DETAIL_ROWS + PRO_SKELETON_DATE_ROWS,
    )
  })
})
