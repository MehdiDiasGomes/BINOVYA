import { describe, expect, it } from 'vitest'

import { escapeXml } from '../../../server/utils/xml'

describe('escapeXml', () => {
  it.each([
    ['&', '&amp;'],
    ['<', '&lt;'],
    ['>', '&gt;'],
    ['"', '&quot;'],
    ["'", '&apos;'],
  ])('escapes %s', (character: string, entity: string) => {
    expect(escapeXml(character)).toBe(entity)
  })

  it('escapes every occurrence and leaves other text untouched', () => {
    expect(escapeXml('/a?b=1&c=2&d=<x>')).toBe('/a?b=1&amp;c=2&amp;d=&lt;x&gt;')
  })

  it('does not escape twice an ampersand it produced', () => {
    expect(escapeXml('<&>')).toBe('&lt;&amp;&gt;')
  })
})
