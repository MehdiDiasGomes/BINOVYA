import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'

import { describe, expect, it } from 'vitest'

import { BUTTON_TRAILING_ICON_CLASS, buttonClass } from '../../../app/constants/buttons'

import type { ButtonClassOptions, ButtonSize, ButtonVariant } from '../../../app/types/button'

const VARIANTS: ButtonVariant[] = [
  ...readFileSync(resolvePath(process.cwd(), 'app/types/button.ts'), 'utf8')
    .split('export type ButtonSize')[0]!
    .matchAll(/'(\w+)'/g),
].map(match => match[1] as ButtonVariant)

const SIZES: ButtonSize[] = ['md', 'sm', 'icon']

describe('buttonClass', () => {
  it('uses the primary medium button when nothing is given', () => {
    const classes = buttonClass({} as ButtonClassOptions)
    expect(classes).toContain('bg-primary')
    expect(classes).toContain('min-h-12')
  })

  it.each(SIZES)('every variant carries the %s size and the shared base', size => {
    const minHeight = size === 'md' ? 'min-h-12' : 'min-h-11'
    VARIANTS.forEach(variant => {
      const classes = buttonClass({ variant, size })
      expect(classes).toContain(minHeight)
      expect(classes).toContain('inline-flex')
      expect(classes).toContain('focus-visible:ring-[3px]')
    })
  })

  it('keeps a 44 px touch target on the small size', () => {
    expect(buttonClass({ variant: 'secondary', size: 'sm' })).toContain('min-h-11')
  })

  it('gives each variant a class set of its own', () => {
    const sets = new Set(VARIANTS.map(variant => buttonClass({ variant, size: 'md' })))
    expect(sets.size).toBe(VARIANTS.length)
  })

  it.each(VARIANTS)(
    'styles the disabled state of %s through disabled and aria-disabled',
    variant => {
      const classes = buttonClass({ variant, size: 'md' })
      expect(classes).toContain('disabled:opacity-60')
      expect(classes).toContain('aria-disabled:opacity-60')
      expect(classes).toContain('aria-disabled:cursor-not-allowed')
    },
  )

  it.each(VARIANTS)('lifts, shadows and presses %s on hover and press', variant => {
    const classes = buttonClass({ variant, size: 'md' })
    expect(classes).toContain('hover:-translate-y-0.5')
    expect(classes).toMatch(/(?:^|\s)hover:shadow-(?:md|lg)\s/)
    expect(classes).toMatch(/(?:^|\s)hover:shadow-\S+\/\d+(?:\s|$)/)
    expect(classes).toContain('active:translate-y-0')
    expect(classes).toContain('active:scale-[0.98]')
  })

  it.each(VARIANTS)('never lifts, shadows or shines a disabled %s', variant => {
    const classes = buttonClass({ variant, size: 'md' })
    expect(classes).toContain('disabled:hover:translate-y-0')
    expect(classes).toContain('disabled:hover:shadow-none')
    expect(classes).toContain('disabled:before:hidden')
    expect(classes).toContain('aria-disabled:hover:translate-y-0')
    expect(classes).toContain('aria-disabled:hover:shadow-none')
    expect(classes).toContain('aria-disabled:active:scale-100')
    expect(classes).toContain('aria-disabled:before:hidden')
  })

  it.each(VARIANTS)('draws a shine band behind the content of %s', variant => {
    const classes = buttonClass({ variant, size: 'md' })
    expect(classes).toContain('hover:before:translate-x-[300%]')
    expect(classes).toMatch(/(?:^|\s)before:via-\S+/)
  })

  it('respects reduced motion', () => {
    VARIANTS.forEach(variant => {
      const classes = buttonClass({ variant, size: 'md' })
      expect(classes).toContain('motion-reduce:transition-none')
      expect(classes).toContain('motion-reduce:hover:translate-y-0')
      expect(classes).toContain('motion-reduce:active:scale-100')
      expect(classes).toContain('motion-reduce:before:hidden')
    })
  })

  it('nudges the trailing icon on button hover, except when disabled or in reduced motion', () => {
    expect(BUTTON_TRAILING_ICON_CLASS).toContain('motion-safe:group-hover/button:translate-x-0.5')
    expect(BUTTON_TRAILING_ICON_CLASS).toContain(
      'group-disabled/button:group-hover/button:translate-x-0',
    )
    expect(BUTTON_TRAILING_ICON_CLASS).toContain(
      'group-aria-disabled/button:group-hover/button:translate-x-0',
    )
  })

  it('derives the variant list from the source type, destructiveSolid and on-dark additions included', () => {
    expect(VARIANTS).toEqual(
      expect.arrayContaining(['destructiveSolid', 'onDarkPrimary', 'onDarkAccent']),
    )
    expect(new Set(VARIANTS).size).toBe(VARIANTS.length)
  })

  it('uses the destructive colour for the destructive variant', () => {
    expect(buttonClass({ variant: 'destructive', size: 'md' })).toContain('text-destructive')
  })
})
