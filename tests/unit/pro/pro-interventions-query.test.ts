import { describe, expect, it } from 'vitest'

import { PRO_INTERVENTIONS_MAX_PAGE } from '../../../app/constants/pro'
import {
  proListQuery,
  readDate,
  readListPage,
  readQueryString,
  readStatusFilter,
} from '../../../app/utils/proInterventionsQuery'

describe('readQueryString', () => {
  it('reads a single string', () => {
    expect(readQueryString({ status: 'paid' }, 'status')).toBe('paid')
  })

  it('returns null for an absent key', () => {
    expect(readQueryString({}, 'status')).toBeNull()
  })

  it('returns null for a repeated key', () => {
    expect(readQueryString({ status: ['paid', 'cancelled'] }, 'status')).toBeNull()
  })
})

describe('readDate', () => {
  it('reads a valid ISO date', () => {
    expect(readDate({ from: '2041-08-01' }, 'from', '2041-01-01')).toBe('2041-08-01')
  })

  it('uses the fallback when the key is absent', () => {
    expect(readDate({}, 'from', '2041-01-01')).toBe('2041-01-01')
  })

  it.each(['', '2041-02-30', '01/08/2041', 'tomorrow'])('empties the invalid date %j', value => {
    expect(readDate({ from: value }, 'from', '2041-01-01')).toBe('')
  })
})

describe('readStatusFilter', () => {
  it.each(['all', 'pending_payment', 'paid', 'completed', 'cancelled', 'expired'])(
    'keeps the known status %s',
    status => {
      expect(readStatusFilter({ status })).toBe(status)
    },
  )

  it.each(['PAID', 'refunded', ''])('falls back to all for %j', status => {
    expect(readStatusFilter({ status })).toBe('all')
  })

  it('falls back to all without status', () => {
    expect(readStatusFilter({})).toBe('all')
  })
})

describe('readListPage', () => {
  it('reads a page number', () => {
    expect(readListPage({ page: '3' })).toBe(3)
  })

  it('accepts the maximum page', () => {
    expect(readListPage({ page: String(PRO_INTERVENTIONS_MAX_PAGE) })).toBe(
      PRO_INTERVENTIONS_MAX_PAGE,
    )
  })

  it.each(['0', '-1', '1.5', 'abc', '', String(PRO_INTERVENTIONS_MAX_PAGE + 1)])(
    'goes back to the first page for %j',
    page => {
      expect(readListPage({ page })).toBe(1)
    },
  )

  it('goes back to the first page without query', () => {
    expect(readListPage({})).toBe(1)
  })
})

describe('proListQuery', () => {
  it('keeps the valid filters and page', () => {
    const query = { status: 'paid', from: '2041-08-01', to: '2041-08-31', page: '2' }
    expect(proListQuery(query)).toEqual(query)
  })

  it('drops an unknown status, an invalid end date and the first page', () => {
    expect(proListQuery({ status: 'refunded', to: 'nope', page: '1' })).toEqual({})
  })

  it('drops anything else carried by the page', () => {
    expect(proListQuery({ step: '2', origin: 'list' })).toEqual({})
  })

  it('keeps an emptied start date to mean no start date', () => {
    expect(proListQuery({ from: 'nope' })).toEqual({ from: '' })
  })
})
