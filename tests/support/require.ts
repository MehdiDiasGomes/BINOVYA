/**
 * Narrows a possibly missing value, failing the test with a clear message when it is absent.
 * @param value - Value that may be `undefined` or `null`
 * @param name - What the value is, used in the error message
 * @returns The value, typed without `undefined` and `null`
 */
export const requireValue = <T>(value: T | null | undefined, name: string): T => {
  if (value === undefined || value === null) {
    throw new Error(`Missing test value: ${name}`)
  }
  return value
}
