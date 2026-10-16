import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  PARIS_ADDRESS,
  signedAddress,
  THIONVILLE_ADDRESS,
  UCKANGE_ADDRESS,
} from '../../support/address'
import { type ApiResult, bookingBody, postJson } from '../../support/api'
import { pickFreeDates } from '../../support/dates'
import {
  assertTestStripeKey,
  cleanupE2eData,
  countProfiles,
  countQuoteRequests,
  findBookings,
} from '../../support/db'
import { BASE_URL, uniqueTestEmail } from '../../support/env'

const ONE_DAY_MS: number = 24 * 60 * 60 * 1000

type Route = 'booking' | 'quote' | 'availability'

type Attempt = { name: string; address: () => Record<string, unknown> }

const withoutToken = (): Record<string, unknown> => {
  const fields: Record<string, unknown> = { ...signedAddress(THIONVILLE_ADDRESS) }
  delete fields.token
  return fields
}

const ATTEMPTS: Attempt[] = [
  { name: 'a missing token', address: withoutToken },
  {
    name: 'a tampered token',
    address: () => {
      const address = signedAddress(THIONVILLE_ADDRESS)
      return { ...address, token: `${address.token.slice(0, -2)}AA` }
    },
  },
  {
    name: 'a Paris label with the coordinates of Uckange',
    address: () => ({
      ...signedAddress(UCKANGE_ADDRESS),
      label: PARIS_ADDRESS.label,
      city: PARIS_ADDRESS.city,
      postcode: PARIS_ADDRESS.postcode,
    }),
  },
  {
    name: 'the token of another address',
    address: () => ({
      ...signedAddress(THIONVILLE_ADDRESS),
      token: signedAddress(PARIS_ADDRESS).token,
    }),
  },
  {
    name: 'an expired token',
    address: () => signedAddress(THIONVILLE_ADDRESS, Date.now() - 2 * ONE_DAY_MS),
  },
]

const quoteBody = (email: string, address: Record<string, unknown>, website = ''): FormData => {
  const form = new FormData()
  form.append(
    'payload',
    JSON.stringify({
      contact: {
        firstName: 'Int',
        lastName: 'Token',
        company: '',
        email,
        phone: '+33612345678',
      },
      address,
      equipment: ['bins'],
      smallBinCount: 1,
      largeBinCount: 0,
      plan: 'one_off',
      comment: 'Test du jeton',
      website,
    }),
  )
  return form
}

const postQuote = async (
  email: string,
  address: Record<string, unknown>,
  website = '',
): Promise<ApiResult> => {
  const response: Response = await fetch(`${BASE_URL}/api/quote`, {
    method: 'POST',
    body: quoteBody(email, address, website),
  })
  const raw: string = await response.text()
  return { status: response.status, body: JSON.parse(raw || '{}') as ApiResult['body'], raw }
}

const send = async (
  route: Route,
  email: string,
  address: Record<string, unknown>,
): Promise<ApiResult> => {
  if (route === 'booking') {
    return postJson('/api/booking', { ...bookingBody({ email, date }), address })
  }
  if (route === 'quote') {
    return postQuote(email, address)
  }
  return postJson('/api/booking/availability', address)
}

const rowsWritten = async (route: Route, email: string): Promise<number> => {
  if (route === 'booking') {
    return (await findBookings(email)).length + (await countProfiles(email))
  }
  return route === 'quote' ? countQuoteRequests(email) : 0
}

let date: string

beforeAll(async () => {
  assertTestStripeKey()
  await cleanupE2eData()
  ;[date] = await pickFreeDates(1)
})

afterAll(async () => {
  await cleanupE2eData()
})

describe.each<Route>(['booking', 'quote', 'availability'])('address token on %s', route => {
  it.each(ATTEMPTS)('rejects $name with 400 invalidAddress and writes nothing', async attempt => {
    const email = uniqueTestEmail(`token-${route}`)
    const result = await send(route, email, attempt.address())
    expect(result.status).toBe(400)
    expect(result.body.data?.code).toBe('invalidAddress')
    expect(await rowsWritten(route, email)).toBe(0)
  })

  it('accepts a valid token', async () => {
    const email = uniqueTestEmail(`token-ok-${route}`)
    const result = await send(route, email, signedAddress(THIONVILLE_ADDRESS))
    expect(result.status).toBe(200)
    if (route === 'availability') {
      expect(Array.isArray(result.body.days)).toBe(true)
    }
    if (route === 'quote') {
      expect(await countQuoteRequests(email)).toBe(1)
    }
    if (route === 'booking') {
      expect(await findBookings(email)).toHaveLength(1)
    }
  })
})

describe('GET /api/booking/availability', () => {
  it('answers 404 (Nitro, no GET handler) now that the address travels in a POST body', async () => {
    const response: Response = await fetch(
      `${BASE_URL}/api/booking/availability?${new URLSearchParams({
        latitude: String(THIONVILLE_ADDRESS.latitude),
        longitude: String(THIONVILLE_ADDRESS.longitude),
      })}`,
    )
    expect(response.status).toBe(404)
  })
})

describe('POST /api/booking/availability body limit', () => {
  it('rejects a body over 4 KB with 413', async () => {
    const result = await postJson('/api/booking/availability', {
      ...signedAddress(THIONVILLE_ADDRESS),
      label: 'x'.repeat(5000),
    })
    expect(result.status).toBe(413)
  })
})

describe('honeypot on POST /api/quote', () => {
  it('answers a fake 200 and writes nothing, even with an invalid token', async () => {
    const email = uniqueTestEmail('token-honeypot')
    const result = await postQuote(email, withoutToken(), 'https://spam.example')
    expect(result.status).toBe(200)
    expect(await countQuoteRequests(email)).toBe(0)
  })
})

describe('honeypot on POST /api/booking', () => {
  it('answers a fake 200 and writes nothing, even with an invalid token', async () => {
    const email = uniqueTestEmail('token-honeypot-booking')
    const result = await postJson('/api/booking', {
      ...bookingBody({ email, date, website: 'https://spam.example' }),
      address: withoutToken(),
    })
    expect(result.status).toBe(200)
    expect(await findBookings(email)).toHaveLength(0)
  })
})
