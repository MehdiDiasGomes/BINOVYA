/**
 * Normalises an email address the way profiles store it, so two spellings of the same address
 * match: surrounding spaces removed, lower case.
 * @param email - Email address as typed or stored, missing values giving an empty string
 * @returns Normalised email address
 */
export const normalizeEmail = (email: string | undefined): string =>
  (email ?? '').trim().toLowerCase()
