import type { H3Error } from 'h3'

/**
 * Builds the 404 answered for a booking that does not exist, or that BINOVYA Pro does not show,
 * with the `notFound` code shared by every Pro booking route.
 * @returns HTTP error to throw
 */
export const bookingNotFound = (): H3Error =>
  createError({
    statusCode: 404,
    statusMessage: 'Booking not found',
    data: { code: 'notFound' },
  })
