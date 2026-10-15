import type { ContactSubject } from '@/types/contact'

export const CONTACT_SUBJECTS = [
  'meeting',
  'info',
  'other',
] as const satisfies readonly ContactSubject[]

export const CONTACT_MESSAGE_MIN_LENGTH = 10

export const CONTACT_MESSAGE_MAX_LENGTH = 2000
