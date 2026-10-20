import type { ProRejection } from '@/types/pro'
import type { H3Error } from 'h3'

/**
 * Builds the HTTP error of a refusal BINOVYA Pro explains to the admin, its business code in
 * `data.code` so the page shows the matching message.
 * @param rejection - Status, short English message and business code
 * @returns HTTP error to throw
 */
export const codedError = <Code extends string>(rejection: ProRejection<Code>): H3Error =>
  createError({
    statusCode: rejection.statusCode,
    statusMessage: rejection.statusMessage,
    data: { code: rejection.code },
  })

/**
 * Builds the 404 answered for a booking that does not exist, or that BINOVYA Pro does not show,
 * with the `notFound` code shared by every Pro booking route.
 * @returns HTTP error to throw
 */
export const bookingNotFound = (): H3Error =>
  codedError({ statusCode: 404, statusMessage: 'Booking not found', code: 'notFound' })
