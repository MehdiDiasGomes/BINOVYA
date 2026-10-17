import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { claimLoginLink } from '../../../server/utils/loginLink'

import type { H3Event } from 'h3'

type HttpError = Error & { statusCode: number }

const ADMIN_ID = '99999999-2222-3333-4444-555555555555'

const rpcMock = vi.fn()

const sendMock = vi.fn()

const waitUntilMock = vi.fn()

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: (): unknown => ({ rpc: rpcMock }),
}))

const flow = { rpc: 'claim_admin_login_link', send: sendMock } as const

const handle = async (body: unknown): Promise<unknown> => {
  const { handleLoginRequest } = await import('../../../server/utils/loginRequest')
  return handleLoginRequest({ body, waitUntil: waitUntilMock } as unknown as H3Event, flow)
}

const statusOf = (call: Promise<unknown>): Promise<number | undefined> =>
  call.then(
    () => undefined,
    (error: HttpError) => error.statusCode,
  )

beforeEach(() => {
  vi.stubGlobal('assertBodySize', vi.fn())
  vi.stubGlobal('claimLoginLink', claimLoginLink)
  vi.stubGlobal(
    'readValidatedBody',
    async (event: { body: unknown }, validate: (body: unknown) => unknown) => validate(event.body),
  )
  vi.stubGlobal('createError', (options: { statusCode: number }) =>
    Object.assign(new Error('http'), options),
  )
  sendMock.mockResolvedValue(true)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  rpcMock.mockReset()
  sendMock.mockReset()
  waitUntilMock.mockReset()
})

describe('handleLoginRequest', () => {
  it('answers success before the RPC has resolved', async () => {
    rpcMock.mockReturnValue(new Promise(() => undefined))
    expect(await handle({ email: 'a@binovya.test', locale: 'fr' })).toEqual({ success: true })
    expect(waitUntilMock).toHaveBeenCalledTimes(1)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('sends the link in the background when the RPC returns an account id', async () => {
    rpcMock.mockResolvedValue({ data: ADMIN_ID, error: null })
    await handle({ email: 'A@Binovya.test', locale: 'en' })
    await waitUntilMock.mock.calls[0]?.[0]
    expect(rpcMock).toHaveBeenCalledWith('claim_admin_login_link', { p_email: 'a@binovya.test' })
    expect(sendMock).toHaveBeenCalledWith(expect.anything(), ADMIN_ID, 'en')
  })

  it('sends nothing when the RPC answers null, with the same response', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    expect(await handle({ email: 'a@binovya.test', locale: 'fr' })).toEqual({ success: true })
    await waitUntilMock.mock.calls[0]?.[0]
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('does not call the RPC when the honeypot is filled', async () => {
    expect(await handle({ email: 'a@binovya.test', locale: 'fr', website: 'spam' })).toEqual({
      success: true,
    })
    expect(rpcMock).not.toHaveBeenCalled()
    expect(waitUntilMock).not.toHaveBeenCalled()
  })

  it('logs a background failure without the email and still resolves', async () => {
    rpcMock.mockRejectedValue(new Error('boom for a@binovya.test'))
    await handle({ email: 'a@binovya.test', locale: 'fr' })
    await expect(waitUntilMock.mock.calls[0]?.[0]).resolves.toBeUndefined()
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls)
    expect(logged).toContain('claim_admin_login_link')
    expect(logged).not.toContain('binovya.test')
  })

  it('logs a failure of the sending without the email', async () => {
    rpcMock.mockResolvedValue({ data: ADMIN_ID, error: null })
    sendMock.mockRejectedValue(new Error('smtp a@binovya.test'))
    await handle({ email: 'a@binovya.test', locale: 'fr' })
    await waitUntilMock.mock.calls[0]?.[0]
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('binovya.test')
  })

  it('rejects an invalid email with 400 and schedules nothing', async () => {
    expect(await statusOf(handle({ email: 'nope', locale: 'fr' }))).toBe(400)
    expect(waitUntilMock).not.toHaveBeenCalled()
  })

  it('rejects an unsupported locale with 400', async () => {
    expect(await statusOf(handle({ email: 'a@binovya.test', locale: 'de' }))).toBe(400)
  })
})
