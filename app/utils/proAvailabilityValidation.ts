import { z } from 'zod'

import { PRO_DAY_CAPACITY_MAX, PRO_DAY_NOTE_MAX_LENGTH } from '@/constants/pro'

export const dayCapacitySchema = z.number().int().min(0).max(PRO_DAY_CAPACITY_MAX)

export const dayNoteSchema = z.string().trim().max(PRO_DAY_NOTE_MAX_LENGTH)

export const weekdaySchema = z.number().int().min(0).max(6)

/**
 * Turns a note typed by the admin into the stored value: trimmed, null when empty.
 * @param value - Raw text of the note field
 * @returns Note to store, or null
 */
export const normalizeDayNote = (value: string): string | null => {
  const note: string = value.trim()
  return note.length > 0 ? note : null
}
