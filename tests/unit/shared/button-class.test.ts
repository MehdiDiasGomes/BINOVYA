import { describe, expect, it } from 'vitest'

import { buttonClass } from '../../../app/constants/buttons'

import type { ButtonClassOptions, ButtonSize, ButtonVariant } from '../../../app/types/button'

const VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'destructive',
  'warning',
  'onDark',
  'onDarkWarning',
  'onDarkGhost',
  'onDarkOutline',
]

const SIZES: ButtonSize[] = ['md', 'sm']

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

  it('lifts the filled variants on hover but never when disabled', () => {
    ;(['primary', 'warning', 'onDark', 'onDarkWarning'] as ButtonVariant[]).forEach(variant => {
      const classes = buttonClass({ variant, size: 'md' })
      expect(classes).toContain('hover:-translate-y-px')
      expect(classes).toContain('aria-disabled:hover:translate-y-0')
    })
    expect(buttonClass({ variant: 'secondary', size: 'md' })).not.toContain('hover:-translate-y-px')
  })

  it('respects reduced motion', () => {
    VARIANTS.forEach(variant => {
      expect(buttonClass({ variant, size: 'md' })).toContain('motion-reduce:transition-none')
    })
  })

  it('uses the destructive colour for the destructive variant', () => {
    expect(buttonClass({ variant: 'destructive', size: 'md' })).toContain('text-destructive')
  })
})
