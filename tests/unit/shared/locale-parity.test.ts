import { describe, expect, it } from 'vitest'

import enSite from '../../../i18n/locales/en'
import enAccount from '../../../i18n/locales/en/account'
import enBooking from '../../../i18n/locales/en/booking'
import enPro from '../../../i18n/locales/en/pro'
import enProCreate from '../../../i18n/locales/en/proCreate'
import enProPhotos from '../../../i18n/locales/en/proPhotos'
import enProSteps from '../../../i18n/locales/en/proSteps'
import frSite from '../../../i18n/locales/fr'
import frAccount from '../../../i18n/locales/fr/account'
import frBooking from '../../../i18n/locales/fr/booking'
import frPro from '../../../i18n/locales/fr/pro'
import frProCreate from '../../../i18n/locales/fr/proCreate'
import frProPhotos from '../../../i18n/locales/fr/proPhotos'
import frProSteps from '../../../i18n/locales/fr/proSteps'

type Leaf = { path: string; value: string }

const PLACEHOLDER = /\{[a-zA-Z]+\}/g

const leaves = (node: unknown, path: string = ''): Leaf[] => {
  if (typeof node === 'string') {
    return [{ path, value: node }]
  }
  if (Array.isArray(node)) {
    return node.flatMap((item: unknown, index: number) => leaves(item, `${path}[${index}]`))
  }
  if (typeof node === 'object' && node !== null) {
    return Object.entries(node).flatMap(([key, value]) =>
      leaves(value, path ? `${path}.${key}` : key),
    )
  }
  return []
}

const placeholders = (value: string): string[] => [...(value.match(PLACEHOLDER) ?? [])].sort()

const AREAS: [string, unknown, unknown][] = [
  ['site', frSite, enSite],
  ['account', frAccount, enAccount],
  ['booking', frBooking, enBooking],
  ['pro', frPro, enPro],
  ['proCreate', frProCreate, enProCreate],
  ['proPhotos', frProPhotos, enProPhotos],
  ['proSteps', frProSteps, enProSteps],
]

describe.each(AREAS)('locale %s', (_name, fr, en) => {
  const frLeaves = leaves(fr)
  const enLeaves = leaves(en)

  it('has the same keys in French and in English', () => {
    expect(enLeaves.map(leaf => leaf.path).sort()).toEqual(frLeaves.map(leaf => leaf.path).sort())
  })

  it('uses the same placeholders in both languages for every key', () => {
    const enByPath = new Map(enLeaves.map(leaf => [leaf.path, leaf.value]))
    const mismatches = frLeaves
      .filter(leaf => {
        const other = enByPath.get(leaf.path)
        return other !== undefined && placeholders(leaf.value).join() !== placeholders(other).join()
      })
      .map(leaf => leaf.path)
    expect(mismatches).toEqual([])
  })

  it('has no empty text in English', () => {
    expect(enLeaves.filter(leaf => leaf.value.trim() === '').map(leaf => leaf.path)).toEqual([])
  })
})

describe('English customer area texts', () => {
  it('names the area, the failed link card and its login link in English', () => {
    expect(enAccount.confirm.failedTitle).not.toBe(frAccount.confirm.failedTitle)
    expect(enAccount.confirm.loginCta).not.toBe(frAccount.confirm.loginCta)
    expect(enAccount.login.sessionExpired).not.toBe(frAccount.login.sessionExpired)
  })
})
