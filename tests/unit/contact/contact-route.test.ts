import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { requireValue } from '../../support/require'

type Handler = (event: { body: unknown }) => Promise<{ success: boolean }>

type HttpError = Error & { statusCode: number }

const sendMock = vi.fn()
const configMock = vi.fn()
const configuredMock = vi.fn()

const VALID_BODY = {
  firstName: 'Int',
  lastName: 'Test',
  company: '',
  email: 'delivered@resend.dev',
  phone: '+33612345678',
  subject: 'info',
  message: 'Message de test automatique.',
  website: '',
}

const captured: { handler?: Handler } = {}

const capturedHandler = (): Handler | undefined => captured.handler

const loadHandler = async (): Promise<Handler> => {
  vi.resetModules()
  delete captured.handler
  await import('../../../server/api/contact.post')
  return requireValue(capturedHandler(), 'contact handler')
}

const statusOf = async (call: Promise<unknown>): Promise<number | undefined> =>
  call.then(
    () => undefined,
    (error: HttpError) => error.statusCode,
  )

beforeEach(() => {
  configMock.mockReturnValue({ resendApiKey: 're_test', contactEmailTo: 'team@binovya.test' })
  vi.stubGlobal('defineEventHandler', (handler: Handler) => {
    captured.handler = handler
    return handler
  })
  vi.stubGlobal('assertBodySize', () => undefined)
  vi.stubGlobal(
    'readValidatedBody',
    async (event: { body: unknown }, validate: (body: unknown) => unknown) => validate(event.body),
  )
  vi.stubGlobal('createError', (options: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(options.statusMessage), { statusCode: options.statusCode }),
  )
  vi.stubGlobal('escapeHtml', (text: string) => text)
  vi.stubGlobal('useRuntimeConfig', configMock)
  vi.stubGlobal('isMailConfigured', configuredMock)
  configuredMock.mockReturnValue(true)
  vi.stubGlobal('sendTransactionalEmail', sendMock)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  sendMock.mockReset()
  configuredMock.mockReset()
})

describe('contact route', () => {
  it('answers success when the email is accepted', async () => {
    sendMock.mockResolvedValue(true)
    const handler = await loadHandler()
    expect(await handler({ body: VALID_BODY })).toEqual({ success: true })
  })

  it('answers 502 when sending fails or times out', async () => {
    sendMock.mockResolvedValue(false)
    const handler = await loadHandler()
    expect(await statusOf(handler({ body: VALID_BODY }))).toBe(502)
  })

  it('answers 503 without sending when the mail transport is not configured', async () => {
    configuredMock.mockReturnValue(false)
    const handler = await loadHandler()
    expect(await statusOf(handler({ body: VALID_BODY }))).toBe(503)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('sends without any Resend key when the transport is configured', async () => {
    configMock.mockReturnValue({ resendApiKey: '', contactEmailTo: 'team@binovya.test' })
    sendMock.mockResolvedValue(true)
    const handler = await loadHandler()
    expect(await handler({ body: VALID_BODY })).toEqual({ success: true })
    expect(sendMock).toHaveBeenCalledTimes(1)
  })

  it('answers 503 without sending when the recipient is missing', async () => {
    configMock.mockReturnValue({ resendApiKey: 're_test', contactEmailTo: '' })
    const handler = await loadHandler()
    expect(await statusOf(handler({ body: VALID_BODY }))).toBe(503)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('answers 400 for an invalid body', async () => {
    const handler = await loadHandler()
    expect(await statusOf(handler({ body: { ...VALID_BODY, email: 'nope' } }))).toBe(400)
  })

  it('answers success without sending when the honeypot is filled', async () => {
    const handler = await loadHandler()
    expect(await handler({ body: { ...VALID_BODY, website: 'https://spam.test' } })).toEqual({
      success: true,
    })
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('sends to the configured recipient with the visitor as reply-to', async () => {
    sendMock.mockResolvedValue(true)
    const handler = await loadHandler()
    await handler({ body: VALID_BODY })
    expect(sendMock.mock.calls[0]?.[0]).toMatchObject({
      to: 'team@binovya.test',
      replyTo: 'delivered@resend.dev',
    })
  })
})
