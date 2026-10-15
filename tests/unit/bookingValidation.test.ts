import { describe, expect, it } from 'vitest'

import { contactSchema, honeypotSchema, validateContact } from '../../app/utils/bookingValidation'

import type { BookingContact } from '../../app/types/booking'

const contact = (override: Partial<BookingContact> = {}): BookingContact => ({
  firstName: 'Jeanne',
  lastName: 'Martin',
  email: 'jeanne@example.com',
  phone: '06 12 34 56 78',
  phoneCountryCode: 'FR',
  ...override,
})

describe('contactSchema', () => {
  const valid = {
    firstName: 'Jo',
    lastName: 'Li',
    email: 'jo@example.com',
    phone: '+33612345678',
  }

  it('accepts names of 2 and 80 characters', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true)
    expect(
      contactSchema.safeParse({ ...valid, firstName: 'a'.repeat(80), lastName: 'b'.repeat(80) })
        .success,
    ).toBe(true)
  })

  it('rejects a name of 1 character', () => {
    expect(contactSchema.safeParse({ ...valid, firstName: 'J' }).success).toBe(false)
  })

  it('rejects a name of 81 characters', () => {
    expect(contactSchema.safeParse({ ...valid, lastName: 'b'.repeat(81) }).success).toBe(false)
  })

  it('trims a name before measuring it', () => {
    expect(contactSchema.safeParse({ ...valid, firstName: ' J ' }).success).toBe(false)
  })

  it('rejects an email longer than 254 characters', () => {
    const email = `${'a'.repeat(250)}@b.co`
    expect(contactSchema.safeParse({ ...valid, email }).success).toBe(false)
  })
})

describe('honeypotSchema', () => {
  it('accepts an empty string', () => {
    expect(honeypotSchema.safeParse('').success).toBe(true)
  })

  it('rejects more than 200 characters', () => {
    expect(honeypotSchema.safeParse('x'.repeat(201)).success).toBe(false)
  })
})

describe('validateContact', () => {
  it('returns no error for a valid French contact', () => {
    expect(validateContact(contact())).toEqual({})
  })

  it('accepts a Luxembourg phone number', () => {
    expect(validateContact(contact({ phone: '621 123 456', phoneCountryCode: 'LU' }))).toEqual({})
  })

  it('accepts a phone typed with the international prefix', () => {
    expect(validateContact(contact({ phone: '+33 6 12 34 56 78' }))).toEqual({})
  })

  it('reports an invalid email with its translation key', () => {
    expect(validateContact(contact({ email: 'jeanne@' }))).toEqual({
      email: 'booking.contact.errors.email',
    })
  })

  it('reports a too short first name', () => {
    expect(validateContact(contact({ firstName: 'J' }))).toEqual({
      firstName: 'booking.contact.errors.firstName',
    })
  })

  it('reports a too long last name', () => {
    expect(validateContact(contact({ lastName: 'x'.repeat(81) }))).toEqual({
      lastName: 'booking.contact.errors.lastName',
    })
  })

  it('rejects a phone number that is too short', () => {
    expect(validateContact(contact({ phone: '123' }))).toEqual({
      phone: 'booking.contact.errors.phone',
    })
  })

  it('rejects a French mobile with too many digits', () => {
    expect(validateContact(contact({ phone: '06 12 34 56 789' }))).toHaveProperty('phone')
  })

  it('rejects a Belgian number', () => {
    expect(validateContact(contact({ phone: '+32470123456' }))).toHaveProperty('phone')
  })

  it('reports every invalid field at once', () => {
    expect(
      Object.keys(validateContact(contact({ firstName: '', email: '', phone: '' }))).sort(),
    ).toEqual(['email', 'firstName', 'phone'])
  })
})
