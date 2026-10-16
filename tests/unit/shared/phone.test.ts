import { describe, expect, it } from 'vitest'

import { isValidPhone, toInternationalPhone } from '../../../app/utils/phone'

describe('toInternationalPhone', () => {
  it('drops the leading zero of a French number', () => {
    expect(toInternationalPhone('06 12 34 56 78', 'FR')).toBe('+33612345678')
  })

  it('keeps a Luxembourg number as typed', () => {
    expect(toInternationalPhone('621 123 456', 'LU')).toBe('+352621123456')
  })

  it('keeps an already international number', () => {
    expect(toInternationalPhone('+33 6.12.34.56.78', 'LU')).toBe('+33612345678')
  })

  it('turns a 00 prefix into +', () => {
    expect(toInternationalPhone('0033612345678', 'FR')).toBe('+33612345678')
  })
})

describe('isValidPhone', () => {
  it.each(['+33612345678', '+33112345678', '+352621123', '+352621123456'])('accepts %s', phone => {
    expect(isValidPhone(phone)).toBe(true)
  })

  it.each(['+33012345678', '+3361234567', '+336123456789', '+35262112', '0612345678', ''])(
    'rejects "%s"',
    phone => {
      expect(isValidPhone(phone)).toBe(false)
    },
  )
})
