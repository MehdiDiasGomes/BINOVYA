import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  flagInterventionsToMove,
  paidInterventionDates,
} from '../../../server/utils/proInterventions'
import { bookingNotFound, rescheduleBooking } from '../../../server/utils/proReschedule'
import {
  asClient,
  caught,
  day,
  intervention,
  stubCreateError,
  type HttpError,
} from '../../support/pro-fixtures'

beforeEach(() => {
  stubCreateError()
})

describe('rescheduleBooking', () => {
  const BOOKING = '11111111-2222-3333-4444-555555555555'

  const command = { bookingId: BOOKING, date: '2026-12-01', force: false }

  const rpcReturning = (
    row: Record<string, unknown> | null,
    error: unknown = null,
  ): SupabaseClient<Database> =>
    asClient({ rpc: vi.fn().mockResolvedValue({ data: row ? [row] : null, error }) })

  it('passes the booking, the date and force to admin_reschedule_booking', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ ok: true, reason: null, old_date: '2026-11-01', new_date: '2026-12-01' }],
      error: null,
    })
    await rescheduleBooking(asClient({ rpc }), { ...command, force: true })
    expect(rpc).toHaveBeenCalledWith('admin_reschedule_booking', {
      p_booking_id: BOOKING,
      p_new_date: '2026-12-01',
      p_force: true,
    })
  })

  it('returns the dates and no overridden code for a plain move', async () => {
    const result = await rescheduleBooking(
      rpcReturning({
        ok: true,
        reason: null,
        old_date: '2026-11-01',
        new_date: '2026-12-01',
        overridden_reasons: null,
      }),
      command,
    )
    expect(result).toEqual({
      bookingId: BOOKING,
      oldDate: '2026-11-01',
      newDate: '2026-12-01',
      overriddenCodes: [],
    })
  })

  it('maps every overridden reason to its camelCase code, in order', async () => {
    const result = await rescheduleBooking(
      rpcReturning({
        ok: true,
        reason: null,
        old_date: '2026-11-01',
        new_date: '2026-12-01',
        overridden_reasons: ['out_of_area', 'day_closed', 'day_full', 'out_of_sector'],
      }),
      { ...command, force: true },
    )
    expect(result.overriddenCodes).toEqual(['outOfArea', 'dayClosed', 'dayFull', 'outOfSector'])
  })

  it.each([
    ['not_found', 404, 'notFound'],
    ['not_paid', 422, 'notPaid'],
    ['invalid_date', 400, 'invalidDate'],
    ['same_date', 422, 'sameDate'],
    ['past_date', 422, 'pastDate'],
    ['too_far', 400, 'tooFar'],
    ['too_frequent', 429, 'tooFrequent'],
    ['out_of_area', 409, 'outOfArea'],
    ['day_closed', 409, 'dayClosed'],
    ['day_full', 409, 'dayFull'],
    ['out_of_sector', 409, 'outOfSector'],
  ])('turns the refusal %s into HTTP %d with the code %s', async (reason, statusCode, code) => {
    const error = await caught(() =>
      rescheduleBooking(
        rpcReturning({ ok: false, reason, old_date: null, new_date: null }),
        command,
      ),
    )
    expect(error.statusCode).toBe(statusCode)
    expect(error.data).toEqual({ code })
  })

  it('answers 500 when the call fails or returns no row', async () => {
    const failing = await caught(() =>
      rescheduleBooking(rpcReturning(null, { message: 'boom' }), command),
    )
    expect(failing.statusCode).toBe(500)
    const empty = await caught(() => rescheduleBooking(rpcReturning(null), command))
    expect(empty.statusCode).toBe(500)
  })

  it('answers 500 for a success row without dates', async () => {
    const error = await caught(() =>
      rescheduleBooking(
        rpcReturning({ ok: true, reason: null, old_date: null, new_date: null }),
        command,
      ),
    )
    expect(error.statusCode).toBe(500)
  })
})

describe('bookingNotFound', () => {
  it('is a 404 with the notFound code', () => {
    const error = bookingNotFound() as HttpError
    expect(error.statusCode).toBe(404)
    expect(error.data).toEqual({ code: 'notFound' })
  })
})

describe('paidInterventionDates', () => {
  it('lists the distinct dates of paid interventions only', () => {
    expect(
      paidInterventionDates([
        intervention('a', '2026-10-24', 'paid'),
        intervention('b', '2026-10-24', 'paid'),
        intervention('c', '2026-10-25', 'completed'),
        intervention('d', '2026-10-26', 'cancelled'),
        intervention('e', '2026-10-27', 'paid'),
      ]),
    ).toEqual(['2026-10-24', '2026-10-27'])
  })

  it('is empty for no intervention', () => {
    expect(paidInterventionDates([])).toEqual([])
  })
})

describe('flagInterventionsToMove', () => {
  it('flags a paid intervention on a closed day', () => {
    const [flagged] = flagInterventionsToMove(
      [intervention('a', '2026-10-24', 'paid')],
      [day('2026-10-24', { isClosed: true, capacity: 0 })],
    )
    expect(flagged?.isToMove).toBe(true)
  })

  it('does not flag completed or cancelled interventions on a closed day', () => {
    const flags = flagInterventionsToMove(
      [intervention('a', '2026-10-24', 'completed'), intervention('b', '2026-10-24', 'cancelled')],
      [day('2026-10-24', { isClosed: true, capacity: 0 })],
    )
    expect(flags.map(entry => entry.isToMove)).toEqual([false, false])
  })

  it('does not flag a day over capacity, only a closed one', () => {
    const [flagged] = flagInterventionsToMove(
      [intervention('a', '2026-10-24', 'paid')],
      [day('2026-10-24', { capacity: 1, activeCount: 2 })],
    )
    expect(flagged?.isToMove).toBe(false)
  })

  it('does not flag a paid intervention whose day is open or unknown', () => {
    const flags = flagInterventionsToMove(
      [intervention('a', '2026-10-24', 'paid'), intervention('b', '2026-10-30', 'paid')],
      [day('2026-10-24')],
    )
    expect(flags.map(entry => entry.isToMove)).toEqual([false, false])
  })

  it('flags per date and keeps the other fields and the order', () => {
    const input = [intervention('a', '2026-10-24', 'paid'), intervention('b', '2026-10-25', 'paid')]
    const flags = flagInterventionsToMove(input, [
      day('2026-10-24'),
      day('2026-10-25', { isClosed: true, capacity: 0 }),
    ])
    expect(flags.map(entry => [entry.id, entry.isToMove])).toEqual([
      ['a', false],
      ['b', true],
    ])
    expect(flags[1]).toMatchObject({ address: input[1]?.address, amountTotalCents: 1990 })
  })

  it('does not mutate its input', () => {
    const input = [intervention('a', '2026-10-24', 'paid')]
    flagInterventionsToMove(input, [day('2026-10-24', { isClosed: true, capacity: 0 })])
    expect(input[0]?.isToMove).toBe(false)
  })
})
