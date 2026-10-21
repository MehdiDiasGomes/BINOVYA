import { describe, expect, it } from 'vitest'

import { ACCOUNT_STATUS_TONES } from '../../../app/constants/account'
import { PRO_PENDING_PAYMENT_TONE } from '../../../app/constants/pro'
import {
  collectionWeekdaysLabel,
  proCustomerName,
  proInterventionView,
} from '../../../app/utils/proIntervention'

import type { AccountTranslate } from '../../../app/types/account'
import type { ProBookingStatus, ProIntervention } from '../../../app/types/pro'

const UNKNOWN = 'Client inconnu'

const t: AccountTranslate = (key: string): string =>
  key === 'pro.intervention.unknownCustomer' ? UNKNOWN : key

const intervention = (status: ProBookingStatus): ProIntervention => ({
  id: 'b1',
  scheduledDate: '2026-10-19',
  customer: { firstName: 'Ada', lastName: 'Lovelace', phone: '+33612345678' },
  address: '12 rue de la Gare, 57100 Thionville',
  latitude: 49.3595,
  longitude: 6.1685,
  plan: 'one_off',
  smallBinCount: 1,
  largeBinCount: 0,
  householdCollectionWeekdays: [],
  recyclingCollectionWeekdays: [],
  amountTotalCents: 1990,
  status,
  isToMove: false,
  photos: { before: false, after: false },
  completedWithoutPhotos: false,
  paymentMethod: 'stripe',
  createdByAdmin: false,
  paymentDueAt: null,
})

describe('proInterventionView', () => {
  it.each(['paid', 'completed', 'cancelled'] as const)('takes the tone of %s', status => {
    expect(proInterventionView(intervention(status)).tone).toBe(ACCOUNT_STATUS_TONES[status])
  })

  it.each(['paid', 'completed'] as const)('shows %s as paid', status => {
    expect(proInterventionView(intervention(status)).paymentKey).toBe(
      'pro.intervention.payments.paid',
    )
  })

  it('shows a cancelled intervention as refunded', () => {
    expect(proInterventionView(intervention('cancelled')).paymentKey).toBe(
      'pro.intervention.payments.refunded',
    )
  })
})

describe('proInterventionView for admin-created bookings', () => {
  it('shows a pending payment as awaiting the payment link, with a note', () => {
    const view = proInterventionView(intervention('pending_payment'))
    expect(view.paymentKey).toBe('pro.intervention.payments.awaitingLink')
    expect(view.tone).toBe(PRO_PENDING_PAYMENT_TONE)
    expect(view.hasPaymentNote).toBe(true)
  })

  it('shows a booking paid outside the site as offline, with a note', () => {
    const view = proInterventionView({ ...intervention('paid'), paymentMethod: 'offline' })
    expect(view.paymentKey).toBe('pro.intervention.payments.offline')
    expect(view.hasPaymentNote).toBe(true)
  })

  it('has no payment note for a plain online payment', () => {
    expect(proInterventionView(intervention('paid')).hasPaymentNote).toBe(false)
  })

  it('shows a cancelled offline booking as refunded, without note', () => {
    const view = proInterventionView({ ...intervention('cancelled'), paymentMethod: 'offline' })
    expect(view.paymentKey).toBe('pro.intervention.payments.refunded')
    expect(view.hasPaymentNote).toBe(false)
  })
})

describe('proCustomerName', () => {
  it('puts the last name first', () => {
    expect(proCustomerName({ firstName: 'Ada', lastName: 'Lovelace', phone: '' }, t)).toBe(
      'Lovelace Ada',
    )
  })

  it('trims the name when one part is empty', () => {
    expect(proCustomerName({ firstName: '', lastName: 'Lovelace', phone: '' }, t)).toBe('Lovelace')
  })

  it('shows the placeholder without customer', () => {
    expect(proCustomerName(null, t)).toBe(UNKNOWN)
  })

  it('shows the placeholder when both names are empty', () => {
    expect(proCustomerName({ firstName: ' ', lastName: '', phone: '' }, t)).toBe(UNKNOWN)
  })
})

describe('collectionWeekdaysLabel', () => {
  it('lists the days from Monday whatever the input order, Sunday last', () => {
    expect(collectionWeekdaysLabel([0, 4, 1], 'fr')).toBe('lundi, jeudi, dimanche')
  })

  it('follows the locale', () => {
    expect(collectionWeekdaysLabel([3, 1], 'en')).toBe('Monday, Wednesday')
  })

  it('returns an empty string without day', () => {
    expect(collectionWeekdaysLabel([], 'fr')).toBe('')
  })

  it('ignores unknown weekday numbers', () => {
    expect(collectionWeekdaysLabel([9, 2], 'fr')).toBe('mardi')
  })
})
