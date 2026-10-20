import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { accountBookingParamsSchema } from '../../../server/utils/accountSchemas'

type Handler = (event: object) => Promise<unknown>

type HttpError = Error & { statusCode: number }

type ProfileResult = { data: Record<string, unknown> | null; error: object | null }

const BOOKING_ID = 'bbbbbbbb-0000-4000-8000-000000000000'

const state = {
  profile: {
    data: { first_name: 'Ada', deletion_requested_at: null },
    error: null,
  } as ProfileResult,
  routerParams: { id: BOOKING_ID } as Record<string, string>,
  booking: null as Record<string, unknown> | null,
}

const order: string[] = []
const headers: [string, string][] = []
const loadBookingsMock = vi.fn()
const loadBookingMock = vi.fn()
const loadDocumentsMock = vi.fn()
const DOCUMENTS = { photos: [], receiptUrl: null }

const client = {
  from: () => ({
    select: () => ({
      eq: () => ({ maybeSingle: async (): Promise<ProfileResult> => state.profile }),
    }),
  }),
}

vi.mock('#supabase/server', () => ({ serverSupabaseClient: async () => client }))

const loadHandler = async (path: string): Promise<Handler> => {
  vi.resetModules()
  const module = (await import(path)) as { default: Handler }
  return module.default
}

const loadList = (): Promise<Handler> => loadHandler('../../../server/api/account/bookings.get')

const loadDetail = (): Promise<Handler> =>
  loadHandler('../../../server/api/account/bookings/[id].get')

const failureOf = async (call: Promise<unknown>): Promise<{ status?: number; message?: string }> =>
  call.then(
    () => ({}),
    (error: HttpError) => ({ status: error.statusCode, message: error.message }),
  )

beforeEach(() => {
  order.length = 0
  headers.length = 0
  state.profile = { data: { first_name: 'Ada', deletion_requested_at: null }, error: null }
  state.routerParams = { id: BOOKING_ID }
  state.booking = { booking: { id: BOOKING_ID }, paymentIntentId: 'pi_1' }
  loadDocumentsMock.mockResolvedValue(DOCUMENTS)
  loadBookingsMock.mockResolvedValue([])
  loadBookingMock.mockImplementation(async () => state.booking)
  vi.stubGlobal('defineEventHandler', (handler: Handler) => handler)
  vi.stubGlobal('setResponseHeader', (_event: object, name: string, value: string) => {
    order.push('header')
    headers.push([name, value])
  })
  vi.stubGlobal('requireCustomerId', async () => {
    order.push('auth')
    return 'customer-1'
  })
  vi.stubGlobal('getRouterParams', () => state.routerParams)
  vi.stubGlobal('accountBookingParamsSchema', accountBookingParamsSchema)
  vi.stubGlobal('loadAccountBookings', loadBookingsMock)
  vi.stubGlobal('loadAccountBooking', loadBookingMock)
  vi.stubGlobal('loadAccountBookingDocuments', loadDocumentsMock)
  vi.stubGlobal('createError', (options: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(options.statusMessage), { statusCode: options.statusCode }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  loadBookingsMock.mockReset()
  loadBookingMock.mockReset()
  loadDocumentsMock.mockReset()
})

describe('GET /api/account/bookings handler', () => {
  it('sets private, no-store caching before authenticating', async () => {
    const handler = await loadList()
    await handler({})
    expect(headers).toContainEqual(['Cache-Control', 'private, no-store'])
    expect(order[0]).toBe('header')
  })

  it('answers 500 "Bookings unavailable" when the profile query fails', async () => {
    state.profile = { data: null, error: { code: '42' } }
    const handler = await loadList()
    expect(await failureOf(handler({}))).toEqual({ status: 500, message: 'Bookings unavailable' })
  })

  it('answers 404 "Account not found" when the profile is missing', async () => {
    state.profile = { data: null, error: null }
    const handler = await loadList()
    expect(await failureOf(handler({}))).toEqual({ status: 404, message: 'Account not found' })
  })

  it('does not load bookings when the profile is missing or failing', async () => {
    state.profile = { data: null, error: null }
    const handler = await loadList()
    await failureOf(handler({}))
    expect(loadBookingsMock).not.toHaveBeenCalled()
  })

  it('returns the first name, the deletion date and the bookings', async () => {
    loadBookingsMock.mockResolvedValue([{ id: 'a' }])
    const handler = await loadList()
    expect(await handler({})).toEqual({
      firstName: 'Ada',
      deletionRequestedAt: null,
      bookings: [{ id: 'a' }],
    })
  })
})

describe('GET /api/account/bookings/[id] handler', () => {
  it('sets private, no-store caching before authenticating', async () => {
    const handler = await loadDetail()
    await handler({})
    expect(headers).toContainEqual(['Cache-Control', 'private, no-store'])
    expect(order.slice(0, 2)).toEqual(['header', 'auth'])
  })

  it('answers 401 before looking at a malformed id', async () => {
    vi.stubGlobal('requireCustomerId', async () => {
      throw Object.assign(new Error('Authentication required'), { statusCode: 401 })
    })
    state.routerParams = { id: 'not-a-uuid' }
    const handler = await loadDetail()
    expect((await failureOf(handler({}))).status).toBe(401)
    expect(loadBookingMock).not.toHaveBeenCalled()
  })

  it.each(['not-a-uuid', '', '12345', `${BOOKING_ID}x`])(
    'answers 400 "Invalid booking id" for the id "%s"',
    async id => {
      state.routerParams = { id }
      const handler = await loadDetail()
      expect(await failureOf(handler({}))).toEqual({
        status: 400,
        message: 'Invalid booking id',
      })
      expect(loadBookingMock).not.toHaveBeenCalled()
    },
  )

  it('answers 404 "Booking not found" when the loader returns null', async () => {
    state.booking = null
    const handler = await loadDetail()
    expect(await failureOf(handler({}))).toEqual({ status: 404, message: 'Booking not found' })
  })

  it('asks the loader for the customer of the session and the requested id', async () => {
    const handler = await loadDetail()
    await handler({})
    expect(loadBookingMock).toHaveBeenCalledWith(client, 'customer-1', BOOKING_ID)
  })

  it('answers the booking and its documents, without the payment intent', async () => {
    const handler = await loadDetail()
    expect(await handler({})).toEqual({ booking: { id: BOOKING_ID }, documents: DOCUMENTS })
  })

  it('loads the documents of the record found', async () => {
    const handler = await loadDetail()
    await handler({})
    expect(loadDocumentsMock).toHaveBeenCalledWith(client, state.booking)
  })

  it('does not load documents of a missing booking', async () => {
    state.booking = null
    const handler = await loadDetail()
    await failureOf(handler({}))
    expect(loadDocumentsMock).not.toHaveBeenCalled()
  })
})
