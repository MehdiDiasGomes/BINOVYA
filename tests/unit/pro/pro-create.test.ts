import { describe, expect, it } from 'vitest'

import {
  emptyProCreateDraft,
  isProCreateErrorCode,
  isProPaymentLinkErrorCode,
  toProCreateRequest,
  validateProCreateDraft,
} from '../../../app/utils/proCreate'
import { THIONVILLE_ADDRESS } from '../../support/address'

import type { ProCreateDraft } from '../../../app/types/proCreate'

const VALID_DRAFT: ProCreateDraft = {
  ...emptyProCreateDraft(),
  contact: {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.test',
    phone: '06 12 34 56 78',
    phoneCountryCode: 'FR',
  },
  address: { ...THIONVILLE_ADDRESS, token: 'token' },
  smallBinCount: 1,
  date: '2026-11-03',
}

const draft = (patch: Partial<ProCreateDraft>): ProCreateDraft => ({ ...VALID_DRAFT, ...patch })

describe('emptyProCreateDraft', () => {
  it('starts with no customer, no address, no bin, no date and the payment link mode', () => {
    expect(emptyProCreateDraft()).toMatchObject({
      address: null,
      smallBinCount: 0,
      largeBinCount: 0,
      date: '',
      mode: 'payment_link',
      plan: 'one_off',
    })
  })

  it('builds an independent draft each time', () => {
    expect(emptyProCreateDraft().household).not.toBe(emptyProCreateDraft().household)
  })
})

describe('validateProCreateDraft', () => {
  it('accepts a complete draft', () => {
    expect(validateProCreateDraft(VALID_DRAFT, false)).toEqual({})
  })

  it('reports an empty form on every field', () => {
    expect(Object.keys(validateProCreateDraft(emptyProCreateDraft(), false)).sort()).toEqual([
      'address',
      'bins',
      'date',
      'email',
      'firstName',
      'lastName',
      'phone',
    ])
  })

  it('reports a missing address', () => {
    expect(validateProCreateDraft(draft({ address: null }), false).address).toBe(
      'pro.create.errors.address',
    )
  })

  it('reports no bin', () => {
    expect(validateProCreateDraft(draft({ smallBinCount: 0 }), false).bins).toBe(
      'pro.create.errors.bins',
    )
  })

  it('counts the large bins as a bin', () => {
    const errors = validateProCreateDraft(draft({ smallBinCount: 0, largeBinCount: 1 }), false)
    expect(errors.bins).toBeUndefined()
  })

  it('reports a quote required when the grid has no price', () => {
    expect(validateProCreateDraft(draft({ largeBinCount: 5 }), true).bins).toBe(
      'pro.create.errors.quoteRequired',
    )
  })

  it('reports no bin rather than a quote when nothing is chosen', () => {
    expect(validateProCreateDraft(draft({ smallBinCount: 0 }), true).bins).toBe(
      'pro.create.errors.bins',
    )
  })

  it('reports a missing date', () => {
    expect(validateProCreateDraft(draft({ date: '' }), false).date).toBe('pro.create.errors.date')
  })

  it('reports an invalid email with the booking contact key', () => {
    const contact = { ...VALID_DRAFT.contact, email: 'nope' }
    expect(validateProCreateDraft(draft({ contact }), false).email).toBe(
      'booking.contact.errors.email',
    )
  })
})

describe('toProCreateRequest', () => {
  it('sends the phone in international format and drops the country code', () => {
    const request = toProCreateRequest(VALID_DRAFT, false)
    expect(request?.contact.phone).toBe('+33612345678')
    expect(request?.contact).not.toHaveProperty('phoneCountryCode')
  })

  it('maps the collection answers to weekdays', () => {
    const request = toProCreateRequest(
      draft({ household: { weekdays: [1, 4], isUnknown: false } }),
      false,
    )
    expect(request?.householdCollectionWeekdays).toEqual([1, 4])
    expect(request?.recyclingCollectionWeekdays).toEqual([])
  })

  it('carries the mode, date, bins and the force flag', () => {
    const request = toProCreateRequest(draft({ mode: 'offline', largeBinCount: 1 }), true)
    expect(request).toMatchObject({
      mode: 'offline',
      date: '2026-11-03',
      smallBinCount: 1,
      largeBinCount: 1,
      force: true,
    })
  })

  it('returns null without address', () => {
    expect(toProCreateRequest(draft({ address: null }), false)).toBeNull()
  })

  it('returns null without date', () => {
    expect(toProCreateRequest(draft({ date: '' }), false)).toBeNull()
  })
})

describe('isProCreateErrorCode', () => {
  it.each(['invalidInput', 'dayClosed', 'dayFull', 'outOfArea', 'customerPending', 'tooFar'])(
    'knows %s',
    code => {
      expect(isProCreateErrorCode(code)).toBe(true)
    },
  )

  it.each(['notPending', 'unknown', '', null, undefined, 42])('refuses %j', code => {
    expect(isProCreateErrorCode(code)).toBe(false)
  })
})

describe('isProPaymentLinkErrorCode', () => {
  it.each(['notFound', 'notPending', 'linkExpired', 'noLink', 'tooFrequent', 'emailFailed'])(
    'knows %s',
    code => {
      expect(isProPaymentLinkErrorCode(code)).toBe(true)
    },
  )

  it.each(['dayClosed', 'unknown', null, 0])('refuses %j', code => {
    expect(isProPaymentLinkErrorCode(code)).toBe(false)
  })
})
