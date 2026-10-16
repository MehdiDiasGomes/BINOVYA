/**
 * Uppercases the first character of a text with the rules of a locale.
 * @param text - Text to transform
 * @param locale - BCP 47 locale used for the case mapping
 * @returns Text starting with an uppercase character
 */
export const capitalizeFirst = (text: string, locale: string): string =>
  text.charAt(0).toLocaleUpperCase(locale) + text.slice(1)
