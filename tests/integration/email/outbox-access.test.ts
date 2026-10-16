import { readdir } from 'node:fs/promises'
import { resolve as resolvePath } from 'node:path'

import { describe, expect, it } from 'vitest'

import { postJson } from '../../support/api'
import { BASE_URL, adminMailbox, uniqueTestEmail } from '../../support/env'
import { outboxDirectory, waitForMails } from '../../support/outbox'

const fetchBody = async (path: string): Promise<{ status: number; text: string }> => {
  const response = await fetch(`${BASE_URL}${path}`)
  return { status: response.status, text: await response.text() }
}

describe('the mail outbox is not served by the dev server', () => {
  it('refuses to serve an outbox file through the Vite file system routes', async () => {
    const sender = uniqueTestEmail('mail-access')
    const lastName = `Acces${crypto.randomUUID().slice(0, 8)}`
    const result = await postJson('/api/contact', {
      firstName: 'Ada',
      lastName,
      company: '',
      email: sender,
      phone: '+33612345678',
      subject: 'info',
      message: 'Message de test automatique.',
      website: '',
    })
    expect(result.status).toBe(200)
    const [mail] = await waitForMails({ to: adminMailbox(), subjectIncludes: lastName })
    expect(mail).toBeDefined()

    const names = (await readdir(outboxDirectory())).filter(name => name.endsWith('.json'))
    const file = names.find(name => name.includes(mail?.id ?? 'none')) ?? ''
    expect(file).not.toBe('')
    const absolute = resolvePath(outboxDirectory(), file)
    const control = await fetchBody(`/_nuxt/@fs${resolvePath(process.cwd(), 'package.json')}`)
    expect(control.status).toBe(200)
    const candidates = [`/_nuxt/@fs${absolute}`, `/@fs${absolute}`, `/_nuxt/@fs/${absolute}`]
    const answers = await Promise.all(candidates.map(fetchBody))
    answers.forEach(answer => {
      expect(answer.status).not.toBe(200)
      expect(answer.text).not.toContain(sender)
      expect(answer.text).not.toContain(lastName)
    })
  })
})
