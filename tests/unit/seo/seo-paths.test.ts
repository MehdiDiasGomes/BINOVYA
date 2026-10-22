import { readdirSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  PRIVATE_PAGE_PATHS,
  PRIVATE_PAGE_ROUTE_PATTERNS,
  PUBLIC_PAGE_PATHS,
} from '../../../app/constants/seo'
import {
  isPrivatePagePath,
  localizedPagePath,
  localizedPageUrl,
  pathWithoutLocalePrefix,
} from '../../../app/utils/seo'

const PAGES_DIRECTORY: string = resolvePath(process.cwd(), 'app/pages')

const listPageRoutes = (directory: string = PAGES_DIRECTORY): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full: string = resolvePath(directory, entry.name)
    if (entry.isDirectory()) {
      return listPageRoutes(full)
    }
    const route: string = full
      .slice(PAGES_DIRECTORY.length)
      .replace(/\.vue$/, '')
      .replace(/\/index$/, '')
    return [route || '/']
  })

const hasRouteUnderRoot = (routes: string[], root: string): boolean =>
  routes.some(route => route === root || route.startsWith(`${root}/`))

describe('page classification', () => {
  const pageRoutes: string[] = listPageRoutes()

  it('classifies every page of app/pages as public or private', () => {
    const unclassified: string[] = pageRoutes.filter(
      route => !PUBLIC_PAGE_PATHS.includes(route) && !isPrivatePagePath(route),
    )
    expect(unclassified).toEqual([])
  })

  it('lists no public page that does not exist', () => {
    expect(PUBLIC_PAGE_PATHS.filter(path => !pageRoutes.includes(path))).toEqual([])
  })

  it('never lists a page as both public and private', () => {
    expect(PUBLIC_PAGE_PATHS.filter(path => isPrivatePagePath(path))).toEqual([])
  })

  it('lists no private root that has no page', () => {
    const missing: string[] = PRIVATE_PAGE_PATHS.filter(
      root => !hasRouteUnderRoot(pageRoutes, root),
    )
    expect(missing).toEqual([])
  })
})

describe('PRIVATE_PAGE_ROUTE_PATTERNS', () => {
  it('covers each private root and its subtree in French and English', () => {
    const expected: string[] = PRIVATE_PAGE_PATHS.flatMap(path => [
      path,
      `${path}/**`,
      `/en${path}`,
      `/en${path}/**`,
    ])
    expect([...PRIVATE_PAGE_ROUTE_PATTERNS].sort()).toEqual(expected.sort())
  })
})

describe('localizedPagePath', () => {
  it('keeps the path as is in French', () => {
    expect(localizedPagePath('fr', '/')).toBe('/')
    expect(localizedPagePath('fr', '/contact')).toBe('/contact')
  })

  it('is /en for the English home page', () => {
    expect(localizedPagePath('en', '/')).toBe('/en')
  })

  it('prefixes the other English pages', () => {
    expect(localizedPagePath('en', '/contact')).toBe('/en/contact')
  })
})

describe('localizedPageUrl', () => {
  it('is the bare site URL for the French home page', () => {
    expect(localizedPageUrl('https://binovya.fr', 'fr', '/')).toBe('https://binovya.fr')
  })

  it('is the site URL followed by /en for the English home page', () => {
    expect(localizedPageUrl('https://binovya.fr', 'en', '/')).toBe('https://binovya.fr/en')
  })

  it('appends the localized path of other pages', () => {
    expect(localizedPageUrl('https://binovya.fr', 'en', '/contact')).toBe(
      'https://binovya.fr/en/contact',
    )
  })
})

describe('pathWithoutLocalePrefix', () => {
  it('turns /en into the home page', () => {
    expect(pathWithoutLocalePrefix('/en')).toBe('/')
  })

  it('removes the prefix of a nested path', () => {
    expect(pathWithoutLocalePrefix('/en/pro/x')).toBe('/pro/x')
  })

  it('keeps a path that only starts with the letters of the prefix', () => {
    expect(pathWithoutLocalePrefix('/enfoo')).toBe('/enfoo')
  })

  it('keeps a French path', () => {
    expect(pathWithoutLocalePrefix('/contact')).toBe('/contact')
  })
})

describe('isPrivatePagePath', () => {
  it('is true for a nested English customer area path', () => {
    expect(isPrivatePagePath('/en/account/bookings/1')).toBe(true)
  })

  it('is true for the root of each private area', () => {
    PRIVATE_PAGE_PATHS.forEach(path => expect(isPrivatePagePath(path)).toBe(true))
  })

  it('is false for a path that only starts with the letters of a private root', () => {
    expect(isPrivatePagePath('/professional')).toBe(false)
  })

  it('is false for a public page', () => {
    expect(isPrivatePagePath('/contact')).toBe(false)
  })
})
