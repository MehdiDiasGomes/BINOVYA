const XML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

/**
 * Escapes the characters that would break an XML text node or attribute value.
 * @param text - Raw text
 * @returns Text safe to put in an XML document
 */
export const escapeXml = (text: string): string =>
  text.replace(/[&<>"']/g, (character: string): string => XML_ESCAPES[character] ?? character)
