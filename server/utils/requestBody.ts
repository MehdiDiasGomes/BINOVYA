import type { H3Event } from 'h3'

/**
 * Rejects a request whose body could exceed a size limit, before the body is read. Chunked
 * requests have no announced length and are refused, so the limit cannot be bypassed.
 * @param event - Incoming request
 * @param maxBytes - Largest accepted body, in bytes
 */
export const assertBodySize = (event: H3Event, maxBytes: number): void => {
  const contentLength: string | undefined = getRequestHeader(event, 'content-length')
  if (!contentLength || getRequestHeader(event, 'transfer-encoding')) {
    throw createError({ statusCode: 411, statusMessage: 'Content-Length required' })
  }
  if (Number(contentLength) > maxBytes) {
    throw createError({ statusCode: 413, statusMessage: 'Request too large' })
  }
}
