import type { H3Event } from 'h3'

import { FORBIDDEN_ORIGIN_CODE } from '@/constants/account'

const originOf = (url: string): string | null => {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

/**
 * Rejects a state-changing request that does not come from the site itself, as a CSRF guard on
 * routes authenticated by cookie. The `Origin` header must match `NUXT_SITE_URL`, or in
 * development the origin the request was sent to.
 * @param event - Incoming request
 * @throws 403 with the code `forbiddenOrigin` when the `Origin` header is missing or comes from
 * another origin
 */
export const assertSameOrigin = (event: H3Event): void => {
  const origin: string | undefined = getRequestHeader(event, 'origin')
  const allowedOrigins: (string | null)[] = [
    originOf(resolveSiteUrl()),
    import.meta.dev ? getRequestURL(event).origin : null,
  ]
  if (!origin || !allowedOrigins.includes(origin)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden origin',
      data: { code: FORBIDDEN_ORIGIN_CODE },
    })
  }
}
