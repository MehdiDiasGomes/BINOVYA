import juice from 'juice'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { generateContactEmailHtml } from '../../../app/templates/email/contactEmail'
import { emailButton, renderEmailLayout } from '../../../app/templates/email/layout'
import { escapeHtml, finalizeEmailHtml } from '../../../server/utils/mail'

const ATTACK_TIMEOUT_MS = 5000

const NESTING_LEVELS = 4

const rawBraces = (text: string): string =>
  text.replace(/[&<>"']/g, character => `&#${character.charCodeAt(0)};`)

const CONTACT = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  company: '',
  email: 'ada@example.test',
  phone: '+33612345678',
  subjectLabel: 'Autre',
}

const attackLevel = (index: number): string =>
  '{{' + `JUICE_CODE_BLOCK_${index + 1}_`.repeat(10) + '}}'

const attackMessage: string = Array.from({ length: NESTING_LEVELS }, (_unused, index) =>
  attackLevel(index),
).join('')

const SCRIPT_SCHEME: string = ['javascript', 'alert(1)'].join(':')

const setConfig = (config: { siteUrl: string; contactEmailTo: string }): void => {
  vi.stubGlobal('useRuntimeConfig', () => config)
}

beforeEach(() => {
  setConfig({ siteUrl: 'https://binovya.fr', contactEmailTo: 'contact@binovya.fr' })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const sample = (): string =>
  renderEmailLayout({
    title: 'T',
    preheader: 'p',
    content: emailButton('Cliquer', 'https://binovya.fr/x'),
  })

describe('finalizeEmailHtml styles', () => {
  let output: string = ''

  beforeEach(() => {
    output = finalizeEmailHtml(sample())
  })

  it('inlines the background color on the button cell', () => {
    expect(output).toMatch(/<td class="button-cell"[^>]*style="[^"]*background-color:\s*#0975ab/)
  })

  it('inlines the text color on the button link', () => {
    expect(output).toMatch(/<a class="button"[^>]*style="[^"]*color:\s*#fff/)
  })

  it('keeps only the media query in the style tag', () => {
    const blocks: string[] = [...output.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(
      match => match[1] ?? '',
    )
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toContain('@media')
    expect(blocks[0]).not.toMatch(/\.button\s*\{/)
    expect(blocks[0]).not.toMatch(/\.wordmark\s*\{/)
  })

  it('inlines the wordmark and the card', () => {
    expect(output).toMatch(/<p class="wordmark"[^>]*style="[^"]*color:\s*#135a73/)
    expect(output).toMatch(/class="[^"]*card[^"]*"[^>]*style="[^"]*border-radius/)
  })
})

describe('finalizeEmailHtml footer links', () => {
  it('fills the links with a valid configuration', () => {
    const output: string = finalizeEmailHtml(sample())
    expect(output).toContain('mailto:contact@binovya.fr')
    expect(output).toContain('href="https://binovya.fr"')
    expect(output).not.toContain('binovya-footer-links')
  })

  it('omits the links with an empty configuration', () => {
    setConfig({ siteUrl: '', contactEmailTo: '' })
    const output: string = finalizeEmailHtml(sample())
    expect(output).not.toContain('mailto:')
    expect(output).not.toContain('binovya-footer-links')
  })

  it('omits the links with an invalid configuration', () => {
    setConfig({ siteUrl: SCRIPT_SCHEME, contactEmailTo: 'a b@c.fr' })
    const output: string = finalizeEmailHtml(sample())
    expect(output).not.toContain('mailto:')
    expect(output).not.toContain(SCRIPT_SCHEME)
  })
})

describe('finalizeEmailHtml hostile input', () => {
  const benign = (length: number): string =>
    generateContactEmailHtml({ ...CONTACT, message: 'x'.repeat(length) }, escapeHtml)

  it('keeps the juice code block table empty', () => {
    expect(Object.keys(juice.codeBlocks)).toEqual([])
  })

  it(
    'does not expand nested code block markers',
    () => {
      const html: string = generateContactEmailHtml(
        { ...CONTACT, message: attackMessage },
        escapeHtml,
      )
      const output: string = finalizeEmailHtml(html)
      const reference: string = finalizeEmailHtml(benign(attackMessage.length))
      expect(output.length).toBeLessThan(reference.length * 1.2)
      expect(output).toContain('JUICE_CODE_BLOCK_1_JUICE_CODE_BLOCK_1_')
    },
    ATTACK_TIMEOUT_MS,
  )

  it(
    'stays bounded even when braces are not escaped',
    () => {
      const html: string = generateContactEmailHtml(
        { ...CONTACT, message: attackMessage },
        rawBraces,
      )
      const output: string = finalizeEmailHtml(html)
      const reference: string = finalizeEmailHtml(benign(attackMessage.length))
      expect(output.length).toBeLessThan(reference.length * 1.2)
      expect(output.match(/JUICE_CODE_BLOCK_/g)).toHaveLength(NESTING_LEVELS * 10)
    },
    ATTACK_TIMEOUT_MS,
  )

  it.each([['<% x %>'], ['<#if a>y</#if>'], ['<@macro/>']])(
    'leaves the template syntax %s as inert text',
    marker => {
      const html: string = generateContactEmailHtml({ ...CONTACT, message: marker }, escapeHtml)
      const output: string = finalizeEmailHtml(html)
      expect(output).toContain(escapeHtml(marker))
      expect(output).not.toContain(marker)
    },
  )

  it('keeps inline styles between braces split across fields', () => {
    const html: string = generateContactEmailHtml(
      { ...CONTACT, firstName: '{{Ada', lastName: 'B}}', message: 'ok' },
      rawBraces,
    )
    const output: string = finalizeEmailHtml(html)
    expect(output).toMatch(/<th class="field-label"[^>]*style="[^"]*text-transform/)
    expect(output).toMatch(/<td class="field-value"[^>]*style="[^"]*font-size/)
  })

  it('keeps inline styles when braces are escaped and split across fields', () => {
    const html: string = generateContactEmailHtml(
      { ...CONTACT, firstName: '{{Ada', lastName: 'B}}', message: 'ok' },
      escapeHtml,
    )
    expect(finalizeEmailHtml(html)).toMatch(
      /<th class="field-label"[^>]*style="[^"]*text-transform/,
    )
  })
})
