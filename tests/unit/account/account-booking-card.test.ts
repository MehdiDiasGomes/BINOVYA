import { describe, expect, it } from 'vitest'

import {
  bookingCardView,
  bookingDateLabel,
  bookingServicesLabel,
} from '../../../app/utils/accountBookingCard'

import type { AccountBooking, AccountBookingStatus } from '../../../app/types/account'

const makeBooking = (overrides: Partial<AccountBooking> = {}): AccountBooking => ({
  id: 'a',
  scheduledDate: '2026-11-18',
  address: '12 rue de la Gare, 57100 Thionville',
  plan: 'one_off',
  smallBinCount: 1,
  largeBinCount: 0,
  amountTotalCents: 1990,
  status: 'paid',
  ...overrides,
})

const translate = (key: string, named: Record<string, unknown>): string =>
  key === 'booking.summary.line' ? `${named.quantity} × ${named.service}` : `<${key}>`

describe('bookingCardView', () => {
  it.each<{ status: AccountBookingStatus; tone: string; statusKey: string; icon: string }>([
    {
      status: 'paid',
      tone: 'info',
      statusKey: 'account.booking.statuses.paid',
      icon: 'CalendarDays',
    },
    {
      status: 'completed',
      tone: 'success',
      statusKey: 'account.booking.statuses.completed',
      icon: 'CircleCheck',
    },
    {
      status: 'cancelled',
      tone: 'neutral',
      statusKey: 'account.booking.statuses.cancelled',
      icon: 'CircleX',
    },
  ])(
    'maps $status to tone $tone, status key and icon $icon',
    ({ status, tone, statusKey, icon }) => {
      const view = bookingCardView(makeBooking({ status }))
      expect(view.tone).toBe(tone)
      expect(view.statusKey).toBe(statusKey)
      expect(view.icon).toBe(icon)
    },
  )

  it('labels the amount as refunded for a cancelled booking only', () => {
    expect(bookingCardView(makeBooking({ status: 'cancelled' })).amountKey).toBe(
      'account.booking.refunded',
    )
    expect(bookingCardView(makeBooking({ status: 'paid' })).amountKey).toBe(
      'account.booking.amount',
    )
    expect(bookingCardView(makeBooking({ status: 'completed' })).amountKey).toBe(
      'account.booking.amount',
    )
  })

  it('shows the reminder for a paid booking only', () => {
    expect(bookingCardView(makeBooking({ status: 'paid' })).showReminder).toBe(true)
    expect(bookingCardView(makeBooking({ status: 'completed' })).showReminder).toBe(false)
    expect(bookingCardView(makeBooking({ status: 'cancelled' })).showReminder).toBe(false)
  })

  it('offers to rebook for a cancelled booking only', () => {
    expect(bookingCardView(makeBooking({ status: 'cancelled' })).showRebook).toBe(true)
    expect(bookingCardView(makeBooking({ status: 'paid' })).showRebook).toBe(false)
    expect(bookingCardView(makeBooking({ status: 'completed' })).showRebook).toBe(false)
  })
})

describe('bookingDateLabel', () => {
  it('formats a French long date starting with an uppercase letter', () => {
    expect(bookingDateLabel('2026-11-18', 'fr')).toBe('Mercredi 18 novembre 2026')
  })

  it('formats an English long date starting with an uppercase letter', () => {
    expect(bookingDateLabel('2026-11-18', 'en')).toBe('Wednesday, November 18, 2026')
  })

  it('keeps the calendar day whatever the time zone', () => {
    expect(bookingDateLabel('2028-02-29', 'fr')).toBe('Mardi 29 février 2028')
  })
})

describe('bookingServicesLabel', () => {
  it('lists the small bins only', () => {
    expect(
      bookingServicesLabel(makeBooking({ smallBinCount: 1, largeBinCount: 0 }), translate),
    ).toBe('1 × <booking.bins.small.title>')
  })

  it('lists the large bins only', () => {
    expect(
      bookingServicesLabel(makeBooking({ smallBinCount: 0, largeBinCount: 2 }), translate),
    ).toBe('2 × <booking.bins.large.title>')
  })

  it('joins small and large bins with a plus sign, small first', () => {
    expect(
      bookingServicesLabel(makeBooking({ smallBinCount: 1, largeBinCount: 2 }), translate),
    ).toBe('1 × <booking.bins.small.title> + 2 × <booking.bins.large.title>')
  })

  it('passes the quantity as given for several bins', () => {
    expect(
      bookingServicesLabel(makeBooking({ smallBinCount: 3, largeBinCount: 0 }), translate),
    ).toBe('3 × <booking.bins.small.title>')
  })

  it('returns an empty string when there is no bin', () => {
    expect(
      bookingServicesLabel(makeBooking({ smallBinCount: 0, largeBinCount: 0 }), translate),
    ).toBe('')
  })
})
