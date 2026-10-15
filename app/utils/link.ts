const LOCAL_HOSTNAMES: string[] = ['localhost', '127.0.0.1']

const PLAUSIBLE_EMAIL = /^[^\s@]+@[^\s@]+$/

/**
 * Parses a URL that may be put in a link of an email: https, or plain http on localhost only.
 * @param value - URL from the configuration or built by the server
 * @returns Parsed URL, or null when it is invalid or uses another scheme
 */
export const parseSecureUrl = (value: string): URL | null => {
  try {
    const url: URL = new URL(value)
    const isSecure: boolean =
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && LOCAL_HOSTNAMES.includes(url.hostname))
    return isSecure ? url : null
  } catch {
    return null
  }
}

/**
 * Checks loosely that a value looks like a single email address, without spaces or line breaks.
 * @param value - Address from the configuration
 * @returns True when the value can be used in a `mailto:` link
 */
export const isPlausibleEmail = (value: string): boolean => PLAUSIBLE_EMAIL.test(value)
