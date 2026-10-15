import { describe, expect, it } from 'vitest'

import { reminderDateWindow } from '../../server/utils/bookingReminders'

describe('reminderDateWindow', () => {
  it('covers J+1 to J+2 on an ordinary day', () => {
    expect(reminderDateWindow(new Date('2026-10-15T06:00:00Z'))).toEqual({
      from: '2026-10-16',
      to: '2026-10-17',
    })
  })

  it('uses the Paris date after midnight Paris but before midnight UTC (winter)', () => {
    expect(reminderDateWindow(new Date('2026-12-10T23:30:00Z'))).toEqual({
      from: '2026-12-12',
      to: '2026-12-13',
    })
  })

  it('uses the Paris date after midnight Paris but before midnight UTC (summer)', () => {
    expect(reminderDateWindow(new Date('2026-07-10T22:30:00Z'))).toEqual({
      from: '2026-07-12',
      to: '2026-07-13',
    })
  })

  it('keeps the Paris day just before Paris midnight', () => {
    expect(reminderDateWindow(new Date('2026-07-10T21:59:00Z'))).toEqual({
      from: '2026-07-11',
      to: '2026-07-12',
    })
  })

  it('does not skip or repeat a day across the summer-time change', () => {
    expect(reminderDateWindow(new Date('2026-03-28T12:00:00Z'))).toEqual({
      from: '2026-03-29',
      to: '2026-03-30',
    })
    expect(reminderDateWindow(new Date('2026-03-29T12:00:00Z'))).toEqual({
      from: '2026-03-30',
      to: '2026-03-31',
    })
  })

  it('does not skip or repeat a day across the winter-time change', () => {
    expect(reminderDateWindow(new Date('2026-10-24T12:00:00Z'))).toEqual({
      from: '2026-10-25',
      to: '2026-10-26',
    })
    expect(reminderDateWindow(new Date('2026-10-25T12:00:00Z'))).toEqual({
      from: '2026-10-26',
      to: '2026-10-27',
    })
  })

  it('crosses the end of the year', () => {
    expect(reminderDateWindow(new Date('2026-12-30T10:00:00Z'))).toEqual({
      from: '2026-12-31',
      to: '2027-01-01',
    })
  })

  it('crosses a leap day', () => {
    expect(reminderDateWindow(new Date('2028-02-28T10:00:00Z'))).toEqual({
      from: '2028-02-29',
      to: '2028-03-01',
    })
  })
})
