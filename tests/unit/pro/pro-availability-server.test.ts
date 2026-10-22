import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import {
  deleteDayOverride,
  loadDayOverview,
  loadDayOverviews,
  loadDayOverviewsOfDates,
  loadWeekdayRules,
  saveDayOverride,
  saveWeekdayRules,
} from '../../../server/utils/proAvailability'
import { THIONVILLE_COMMUNE } from '../../support/address'
import {
  OK,
  FAILURE,
  asClient,
  caught,
  overviewRow,
  stubCreateError,
  type Result,
} from '../../support/pro-fixtures'

import type { Database } from '../../../app/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

beforeEach(() => {
  stubCreateError()
})

type OverrideSetup = {
  upsert: Mock
  eq: Mock
  remove: Mock
  client: SupabaseClient<Database>
}

describe('loadDayOverviews', () => {
  it('calls admin_day_overview with the range and maps the rows', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        overviewRow('2026-10-24', {
          capacity_source: 'override',
          is_closed: true,
          capacity: 0,
          sector_latitude: THIONVILLE_COMMUNE.latitude,
          sector_longitude: THIONVILLE_COMMUNE.longitude,
          sector_label: THIONVILLE_COMMUNE.label,
          note: 'Fête',
          active_count: 2,
          paid_count: 1,
        }),
      ],
      error: null,
    })
    const days = await loadDayOverviews(asClient({ rpc }), '2026-10-24', '2026-10-24')
    expect(rpc).toHaveBeenCalledWith('admin_day_overview', {
      p_from: '2026-10-24',
      p_to: '2026-10-24',
    })
    expect(days).toEqual([
      {
        date: '2026-10-24',
        weekday: 6,
        capacity: 0,
        capacitySource: 'override',
        isClosed: true,
        sector: { latitude: THIONVILLE_COMMUNE.latitude, longitude: THIONVILLE_COMMUNE.longitude },
        sectorLabel: THIONVILLE_COMMUNE.label,
        note: 'Fête',
        activeCount: 2,
        paidCount: 1,
      },
    ])
  })

  it('maps a day without sector coordinates to a null sector', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [overviewRow('2026-10-24')], error: null })
    const [first] = await loadDayOverviews(asClient({ rpc }), '2026-10-24', '2026-10-24')
    expect(first?.sector).toBeNull()
  })

  it('answers 500 when the database fails', async () => {
    const rpc = vi.fn().mockResolvedValue(FAILURE)
    const error = await caught(() =>
      loadDayOverviews(asClient({ rpc }), '2026-10-24', '2026-10-24'),
    )
    expect(error.statusCode).toBe(500)
  })
})

describe('loadDayOverview', () => {
  it('returns the single day of the range', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [overviewRow('2026-10-24')], error: null })
    expect((await loadDayOverview(asClient({ rpc }), '2026-10-24'))?.date).toBe('2026-10-24')
    expect(rpc).toHaveBeenCalledWith('admin_day_overview', {
      p_from: '2026-10-24',
      p_to: '2026-10-24',
    })
  })

  it('returns null when the database returned no row', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null })
    expect(await loadDayOverview(asClient({ rpc }), '2026-10-24')).toBeNull()
  })
})

describe('loadDayOverviewsOfDates', () => {
  const rangesOf = (rpc: ReturnType<typeof vi.fn>): [string, string][] =>
    rpc.mock.calls.map(call => {
      const args = call[1] as { p_from: string; p_to: string }
      return [args.p_from, args.p_to]
    })

  const rpcEchoing = (): ReturnType<typeof vi.fn> =>
    vi.fn().mockImplementation(async (_name: string, args: { p_from: string; p_to: string }) => ({
      data: [overviewRow(args.p_from), overviewRow(args.p_to)],
      error: null,
    }))

  it('makes no call for no date', async () => {
    const rpc = vi.fn()
    expect(await loadDayOverviewsOfDates(asClient({ rpc }), [])).toEqual([])
    expect(rpc).not.toHaveBeenCalled()
  })

  it('covers dates close together with a single call, sorted and deduplicated', async () => {
    const rpc = rpcEchoing()
    await loadDayOverviewsOfDates(asClient({ rpc }), [
      '2026-12-10',
      '2026-11-02',
      '2026-12-10',
      '2026-11-20',
    ])
    expect(rangesOf(rpc)).toEqual([['2026-11-02', '2026-12-10']])
  })

  it('keeps a span of exactly 400 days in one call and splits at 401', async () => {
    const exact = rpcEchoing()
    await loadDayOverviewsOfDates(asClient({ rpc: exact }), ['2026-01-01', '2027-02-05'])
    expect(rangesOf(exact)).toEqual([['2026-01-01', '2027-02-05']])

    const split = rpcEchoing()
    await loadDayOverviewsOfDates(asClient({ rpc: split }), ['2026-01-01', '2027-02-06'])
    expect(rangesOf(split)).toEqual([
      ['2026-01-01', '2026-01-01'],
      ['2027-02-06', '2027-02-06'],
    ])
  })

  it('returns the overviews of every range, flattened', async () => {
    const rpc = rpcEchoing()
    const days = await loadDayOverviewsOfDates(asClient({ rpc }), ['2026-01-01', '2028-01-01'])
    expect(days.map(entry => entry.date)).toEqual([
      '2026-01-01',
      '2026-01-01',
      '2028-01-01',
      '2028-01-01',
    ])
  })

  it('answers 500 when one call fails', async () => {
    const rpc = vi.fn().mockResolvedValue(FAILURE)
    const error = await caught(() => loadDayOverviewsOfDates(asClient({ rpc }), ['2026-01-01']))
    expect(error.statusCode).toBe(500)
  })
})

describe('loadWeekdayRules', () => {
  const clientReturning = (result: Result): SupabaseClient<Database> =>
    asClient({ from: () => ({ select: async () => result }) })

  it('returns seven rules, Sunday first, a missing weekday being closed', async () => {
    const rules = await loadWeekdayRules(
      clientReturning({
        data: [
          { weekday: 1, max_bookings: 3 },
          { weekday: 6, max_bookings: 2 },
        ],
        error: null,
      }),
    )
    expect(rules).toEqual([
      { weekday: 0, maxBookings: 0 },
      { weekday: 1, maxBookings: 3 },
      { weekday: 2, maxBookings: 0 },
      { weekday: 3, maxBookings: 0 },
      { weekday: 4, maxBookings: 0 },
      { weekday: 5, maxBookings: 0 },
      { weekday: 6, maxBookings: 2 },
    ])
  })

  it('answers 500 when the database fails', async () => {
    const error = await caught(() => loadWeekdayRules(clientReturning(FAILURE)))
    expect(error.statusCode).toBe(500)
  })
})

describe('saveWeekdayRules', () => {
  it('upserts every rule in one statement on the weekday', async () => {
    const upsert = vi.fn().mockResolvedValue(OK)
    await saveWeekdayRules(asClient({ from: () => ({ upsert }) }), [
      { weekday: 1, maxBookings: 4 },
      { weekday: 2, maxBookings: 0 },
    ])
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert).toHaveBeenCalledWith(
      [
        { weekday: 1, max_bookings: 4 },
        { weekday: 2, max_bookings: 0 },
      ],
      { onConflict: 'weekday' },
    )
  })

  it('answers 500 when the database refuses', async () => {
    const upsert = vi.fn().mockResolvedValue(FAILURE)
    const error = await caught(() =>
      saveWeekdayRules(asClient({ from: () => ({ upsert }) }), [{ weekday: 1, maxBookings: 4 }]),
    )
    expect(error.statusCode).toBe(500)
  })
})

describe('deleteDayOverride', () => {
  it('deletes the row of the date', async () => {
    const eq = vi.fn().mockResolvedValue(OK)
    const remove = vi.fn().mockReturnValue({ eq })
    await deleteDayOverride(asClient({ from: () => ({ delete: remove }) }), '2026-10-24')
    expect(eq).toHaveBeenCalledWith('date', '2026-10-24')
  })

  it('answers 500 when the database refuses', async () => {
    const eq = vi.fn().mockResolvedValue(FAILURE)
    const remove = vi.fn().mockReturnValue({ eq })
    const client = asClient({ from: () => ({ delete: remove }) })
    const error = await caught(() => deleteDayOverride(client, '2026-10-24'))
    expect(error.statusCode).toBe(500)
  })
})

describe('saveDayOverride', () => {
  const EMPTY_ROW = {
    date: '2026-10-24',
    max_bookings: null,
    sector_latitude: null,
    note: null,
  }

  const setup = (stored: Result): OverrideSetup => {
    const single = vi.fn().mockResolvedValue(stored)
    const select = vi.fn().mockReturnValue({ single })
    const upsert = vi.fn().mockReturnValue({ select })
    const eq = vi.fn().mockResolvedValue(OK)
    const remove = vi.fn().mockReturnValue({ eq })
    return { upsert, eq, remove, client: asClient({ from: () => ({ upsert, delete: remove }) }) }
  }

  const SECTOR = { ...THIONVILLE_COMMUNE, token: 't' }

  it('keeps the stored sector when the request has none', async () => {
    const { client, upsert } = setup({ data: { ...EMPTY_ROW, max_bookings: 2 }, error: null })
    await saveDayOverride(client, '2026-10-24', { maxBookings: 2, note: null })
    expect(upsert).toHaveBeenCalledWith(
      { date: '2026-10-24', max_bookings: 2, note: null },
      { onConflict: 'date' },
    )
  })

  it('clears the sector columns when the sector is null', async () => {
    const { client, upsert } = setup({ data: { ...EMPTY_ROW, max_bookings: 2 }, error: null })
    await saveDayOverride(client, '2026-10-24', { maxBookings: 2, note: null, sector: null })
    expect(upsert).toHaveBeenCalledWith(
      {
        date: '2026-10-24',
        max_bookings: 2,
        note: null,
        sector_latitude: null,
        sector_longitude: null,
        sector_label: null,
      },
      { onConflict: 'date' },
    )
  })

  it('stores the coordinates and the label of the commune', async () => {
    const { client, upsert } = setup({
      data: { ...EMPTY_ROW, sector_latitude: SECTOR.latitude },
      error: null,
    })
    await saveDayOverride(client, '2026-10-24', { maxBookings: null, note: 'x', sector: SECTOR })
    expect(upsert).toHaveBeenCalledWith(
      {
        date: '2026-10-24',
        max_bookings: null,
        note: 'x',
        sector_latitude: THIONVILLE_COMMUNE.latitude,
        sector_longitude: THIONVILLE_COMMUNE.longitude,
        sector_label: THIONVILLE_COMMUNE.label,
      },
      { onConflict: 'date' },
    )
  })

  it('removes an exception left without any value', async () => {
    const { client, eq, remove } = setup({ data: EMPTY_ROW, error: null })
    await saveDayOverride(client, '2026-10-24', { maxBookings: null, note: null })
    expect(remove).toHaveBeenCalledTimes(1)
    expect(eq).toHaveBeenCalledWith('date', '2026-10-24')
  })

  it('keeps an exception that only has a note, a sector or a capacity of 0', async () => {
    const onlyNote = setup({ data: { ...EMPTY_ROW, note: 'x' }, error: null })
    await saveDayOverride(onlyNote.client, '2026-10-24', { maxBookings: null, note: 'x' })
    expect(onlyNote.remove).not.toHaveBeenCalled()

    const closed = setup({ data: { ...EMPTY_ROW, max_bookings: 0 }, error: null })
    await saveDayOverride(closed.client, '2026-10-24', { maxBookings: 0, note: null })
    expect(closed.remove).not.toHaveBeenCalled()
  })

  it('answers 500 when the upsert fails', async () => {
    const { client } = setup(FAILURE)
    const error = await caught(() =>
      saveDayOverride(client, '2026-10-24', { maxBookings: 1, note: null }),
    )
    expect(error.statusCode).toBe(500)
  })
})
