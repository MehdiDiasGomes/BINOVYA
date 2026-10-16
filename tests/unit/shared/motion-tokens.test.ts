import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { MOTION_EASE, REVEAL_DURATION } from '../../../app/constants/motion'

const css: string = readFileSync(
  fileURLToPath(new URL('../../../app/assets/css/tailwind.css', import.meta.url)),
  'utf8',
)

const tokenValue = (name: string): string | undefined =>
  new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim()

describe('motion tokens shared by TypeScript and Tailwind', () => {
  it('keeps --ease-brand equal to MOTION_EASE', () => {
    expect(tokenValue('--ease-brand')).toBe(`cubic-bezier(${MOTION_EASE.join(', ')})`)
  })

  it('keeps --transition-duration-enter equal to REVEAL_DURATION', () => {
    expect(tokenValue('--transition-duration-enter')).toBe(`${REVEAL_DURATION * 1000}ms`)
  })
})
