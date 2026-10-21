import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive, ref } from 'vue'

import { useProInterventionsFilters } from '../../../app/composables/useProInterventionsFilters'
import { stubVueGlobals } from '../../support/vue-globals'

import type { ProInterventionsFiltersState } from '../../../app/types/pro'

const TODAY = '2041-08-01'

let route = reactive<{ query: Record<string, string> }>({ query: {} })

const push = vi.fn()

const replace = vi.fn()

const setup = (query: Record<string, string> = {}): ProInterventionsFiltersState => {
  route = reactive({ query })
  vi.stubGlobal('useRoute', () => route)
  stubVueGlobals()
  return useProInterventionsFilters()
}

beforeEach(() => {
  push.mockReset().mockImplementation(async ({ query }) => {
    route.query = query
  })
  replace.mockReset().mockImplementation(async ({ query }) => {
    route.query = query
  })
  vi.stubGlobal('useI18n', () => ({ t: (key: string): string => key }))
  vi.stubGlobal('useRouter', () => ({ push, replace }))
  vi.stubGlobal('useBusinessToday', () => ref(TODAY))
})

describe('useProInterventionsFilters query', () => {
  it('lists every status from today on the first page by default', () => {
    expect(setup().query.value).toEqual({
      status: 'all',
      from: TODAY,
      to: undefined,
      page: 1,
    })
  })

  it('reads the status, the dates and the page from the URL', () => {
    const { query, currentPage } = setup({
      status: 'paid',
      from: '2041-08-02',
      to: '2041-08-31',
      page: '2',
    })
    expect(query.value).toEqual({ status: 'paid', from: '2041-08-02', to: '2041-08-31', page: 2 })
    expect(currentPage.value).toBe(2)
  })

  it('sends no start date when the URL empties it', () => {
    expect(setup({ from: '' }).query.value.from).toBeUndefined()
  })

  it('drops an end date earlier than the start date', () => {
    expect(setup({ from: '2041-08-10', to: '2041-08-01' }).query.value.to).toBeUndefined()
  })

  it('ignores an unknown status and an invalid page', () => {
    const { query } = setup({ status: 'refunded', page: 'abc' })
    expect(query.value).toMatchObject({ status: 'all', page: 1 })
  })
})

describe('useProInterventionsFilters range', () => {
  it('has no error while the draft range is ordered', () => {
    expect(setup({ from: '2041-08-01', to: '2041-08-31' }).rangeError.value).toBe('')
  })

  it('names the error when the draft end date is before the start date', () => {
    const { draft, rangeError } = setup()
    draft.to = '2041-07-01'
    expect(rangeError.value).toBe('pro.list.filters.rangeError')
  })

  it('does not navigate with an inverted range', async () => {
    const { draft } = setup()
    draft.to = '2041-07-01'
    await nextTick()
    expect(replace).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })
})

describe('useProInterventionsFilters actions', () => {
  it('changing the status replaces the URL, adding no history entry', async () => {
    const { draft } = setup({ from: '2041-08-01', to: '2041-08-31' })
    draft.status = 'paid'
    await vi.waitFor(() => expect(replace).toHaveBeenCalledTimes(1))
    expect(replace).toHaveBeenCalledWith({
      query: { status: 'paid', from: '2041-08-01', to: '2041-08-31' },
    })
    expect(push).not.toHaveBeenCalled()
  })

  it('clearing the end date leaves it out of the URL', async () => {
    const { draft } = setup({ from: '2041-08-01', to: '2041-08-31' })
    draft.to = ''
    await vi.waitFor(() => expect(replace).toHaveBeenCalledTimes(1))
    expect(replace).toHaveBeenCalledWith({
      query: { status: 'all', from: '2041-08-01', to: undefined },
    })
  })

  it('does not navigate when the draft equals the applied filters', async () => {
    const { draft } = setup({ status: 'paid', from: '2041-08-01' })
    draft.status = 'paid'
    await nextTick()
    expect(replace).not.toHaveBeenCalled()
  })

  it('resetting empties the URL with replace and restores the default draft', async () => {
    const { draft, resetFilters } = setup({ status: 'paid', from: '2041-08-05', to: '2041-08-31' })
    await resetFilters()
    expect(replace).toHaveBeenCalledWith({ query: {} })
    expect(draft).toEqual({ status: 'all', from: TODAY, to: '' })
  })

  it('moving to another page pushes a history entry and keeps the filters', async () => {
    const { goToPage } = setup({ status: 'paid', from: '2041-08-01' })
    await goToPage(2)
    expect(push).toHaveBeenCalledWith({ query: { status: 'paid', from: '2041-08-01', page: '2' } })
    expect(replace).not.toHaveBeenCalled()
  })

  it('returning to the last page can replace the entry', async () => {
    const { goToPage } = setup({ page: '9' })
    await goToPage(3, { replace: true })
    expect(replace).toHaveBeenCalledWith({ query: { page: '3' } })
    expect(push).not.toHaveBeenCalled()
  })

  it.each([0, -1])('refuses the page %i', async page => {
    await setup().goToPage(page)
    expect(push).not.toHaveBeenCalled()
  })

  it('does nothing for the current page', async () => {
    await setup({ page: '2' }).goToPage(2)
    expect(push).not.toHaveBeenCalled()
  })
})
