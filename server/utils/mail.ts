export const CONTACT_SENDER = 'BINOVYA Contact <contact@dg-zenith.com>'

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/**
 * Escapes text so it can be inserted safely in an HTML email.
 * @param text - Untrusted text typed by a visitor
 * @returns Text with HTML special characters escaped
 */
export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, character => HTML_ESCAPES[character] ?? character)
