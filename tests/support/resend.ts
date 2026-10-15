import { readEnv, sleep } from './db'

export type SentEmail = {
  id: string
  to: string[]
  subject: string
  created_at: string
  last_event: string
}

const RESEND_LIST_URL = 'https://api.resend.com/emails?limit=100'

const listRecentEmails = async (): Promise<SentEmail[]> => {
  const response: Response = await fetch(RESEND_LIST_URL, {
    headers: { Authorization: `Bearer ${readEnv('NUXT_RESEND_API_KEY')}` },
  })
  if (!response.ok) {
    return []
  }
  return ((await response.json()) as { data: SentEmail[] }).data
}

type EmailQuery = { to: string; subjectIncludes: string; since?: Date }

const createdAfter = (email: SentEmail, since: Date | undefined): boolean =>
  since === undefined ||
  new Date(email.created_at.replace(' ', 'T').replace(/\+00$/, 'Z')).getTime() >=
    since.getTime() - 2000

/**
 * Polls the Resend API until emails to an address whose subject contains a text are listed.
 * @param query - Recipient and part of the subject
 * @param timeoutMs - Maximum wait
 * @returns Matching emails, empty when none appeared in time
 */
export const waitForSentEmails = async (
  query: EmailQuery,
  timeoutMs = 20_000,
): Promise<SentEmail[]> => {
  const deadline: number = Date.now() + timeoutMs
  let matches: SentEmail[] = []
  while (Date.now() < deadline && matches.length === 0) {
    const emails: SentEmail[] = await listRecentEmails()
    matches = emails.filter(
      email =>
        email.to.includes(query.to) &&
        email.subject.includes(query.subjectIncludes) &&
        createdAfter(email, query.since),
    )
    if (matches.length === 0) {
      await sleep(1500)
    }
  }
  return matches
}
