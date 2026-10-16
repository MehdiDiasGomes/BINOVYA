import { describe, expect, it } from 'vitest'

import { DEFAULT_MAIL_SENDER } from '../../../server/utils/mail'
import { readEnv } from '../../support/env'

type Domain = { name: string; status: string }

const API_KEY: string = readEnv('NUXT_RESEND_API_KEY')

const senderDomain = (sender: string): string => {
  const start: number = sender.indexOf('<')
  const end: number = sender.indexOf('>', start)
  const address: string = start === -1 || end === -1 ? sender : sender.slice(start + 1, end)
  return address.split('@')[1]?.toLowerCase() ?? ''
}

const listDomains = (): Promise<Response> =>
  fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${API_KEY}` } })

describe.skipIf(!API_KEY)('Resend configuration (read-only, nothing is sent)', () => {
  it('accepts the API key', async () => {
    expect((await listDomains()).status).toBe(200)
  })

  it('lists the sender domain as verified', async () => {
    const sender: string = readEnv('NUXT_MAIL_FROM') || DEFAULT_MAIL_SENDER
    const domains: Domain[] = ((await (await listDomains()).json()) as { data: Domain[] }).data
    const domain: Domain | undefined = domains.find(item => item.name === senderDomain(sender))
    expect(domain?.status).toBe('verified')
  })
})
