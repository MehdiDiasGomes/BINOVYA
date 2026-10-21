import { z } from 'zod'

export const isoDateSchema = z.string().date()

/**
 * Tells whether a value is a valid ISO calendar date, such as `2026-10-16`.
 * @param value - Value read from the URL or a date field
 * @returns True when the value is a real `YYYY-MM-DD` date
 */
export const isIsoDate = (value: string): boolean => isoDateSchema.safeParse(value).success
