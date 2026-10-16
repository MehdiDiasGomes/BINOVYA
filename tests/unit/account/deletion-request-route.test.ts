import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (event: object) => Promise<{ requestedAt: string }>

type HttpError = Error & { statusCode: number }

type UpdateCall = { values: Record<string, unknown>; filters: [string, unknown][] }

const REQUESTED_AT = '2026-10-15T10:30:00.000+00:00'

const state = {
  firstUpdateReturns: null as Record<string, unknown> | null,
  updates: [] as UpdateCall[],
  storedRequestedAt: REQUESTED_AT as string | null,
}

const alertMock = vi.fn()

const buildUpdateChain = (call: UpdateCall): Record<string, unknown> => {
  const chain: Record<string, unknown> = {}
  const record = (column: string, value: unknown): Record<string, unknown> => {
    call.filters.push([column, value])
    return chain
  }
  chain.eq = record
  chain.is = record
  chain.select = (): Record<string, unknown> => chain
  chain.maybeSingle = async (): Promise<unknown> => ({
    data: state.firstUpdateReturns,
    error: null,
  })
  chain.then = (resolve: (value: unknown) => void): void => resolve({ error: null })
  return chain
}

const startUpdate = (values: Record<string, unknown>): Record<string, unknown> => {
  const call: UpdateCall = { values, filters: [] }
  state.updates.push(call)
  return buildUpdateChain(call)
}

const readStoredRequest = async (): Promise<unknown> => ({
  data: { deletion_requested_at: state.storedRequestedAt },
  error: null,
})

const serviceRoleClient = (): Record<string, unknown> => ({
  from: () => ({
    update: startUpdate,
    select: () => ({ eq: () => ({ maybeSingle: readStoredRequest }) }),
  }),
})

vi.mock('#supabase/server', () => ({ serverSupabaseServiceRole: serviceRoleClient }))

const loadHandler = async (): Promise<Handler> => {
  vi.resetModules()
  const module = (await import('../../../server/api/account/deletion-request.post')) as {
    default: Handler
  }
  return module.default
}

const statusOf = async (call: Promise<unknown>): Promise<number | undefined> =>
  call.then(
    () => undefined,
    (error: HttpError) => error.statusCode,
  )

beforeEach(() => {
  state.updates = []
  state.storedRequestedAt = REQUESTED_AT
  state.firstUpdateReturns = {
    email: 'ada@example.test',
    first_name: 'Ada',
    last_name: 'Lovelace',
    phone: '+33612345678',
    deletion_requested_at: REQUESTED_AT,
  }
  vi.stubGlobal('defineEventHandler', (handler: Handler) => handler)
  vi.stubGlobal('assertSameOrigin', () => undefined)
  vi.stubGlobal('requireCustomerId', async () => 'customer-1')
  vi.stubGlobal('sendDeletionRequestAlert', alertMock)
  vi.stubGlobal('createError', (options: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(options.statusMessage), { statusCode: options.statusCode }),
  )
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  alertMock.mockReset()
})

describe('deletion request route', () => {
  it('checks the origin before anything else', async () => {
    vi.stubGlobal('assertSameOrigin', () => {
      throw Object.assign(new Error('Forbidden origin'), { statusCode: 403 })
    })
    const requireSpy = vi.fn()
    vi.stubGlobal('requireCustomerId', requireSpy)
    const handler = await loadHandler()
    expect(await statusOf(handler({}))).toBe(403)
    expect(requireSpy).not.toHaveBeenCalled()
  })

  it('answers 401 when there is no session and touches nothing', async () => {
    vi.stubGlobal('requireCustomerId', async () => {
      throw Object.assign(new Error('Authentication required'), { statusCode: 401 })
    })
    const handler = await loadHandler()
    expect(await statusOf(handler({}))).toBe(401)
    expect(state.updates).toHaveLength(0)
  })

  it('records the request once and alerts BINOVYA', async () => {
    alertMock.mockResolvedValue(true)
    const handler = await loadHandler()
    expect(await handler({})).toEqual({ requestedAt: REQUESTED_AT })
    expect(alertMock).toHaveBeenCalledTimes(1)
    expect(state.updates[0]?.filters).toContainEqual(['deletion_requested_at', null])
  })

  it('returns the existing request without a new alert when already requested', async () => {
    state.firstUpdateReturns = null
    const handler = await loadHandler()
    expect(await handler({})).toEqual({ requestedAt: REQUESTED_AT })
    expect(alertMock).not.toHaveBeenCalled()
  })

  it('resets the request and answers 502 when the alert fails', async () => {
    alertMock.mockResolvedValue(false)
    const handler = await loadHandler()
    expect(await statusOf(handler({}))).toBe(502)
    const reset = state.updates[1]
    expect(reset?.values).toEqual({ deletion_requested_at: null })
    expect(reset?.filters).toContainEqual(['deletion_requested_at', REQUESTED_AT])
  })
})
