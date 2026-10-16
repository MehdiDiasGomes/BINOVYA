/**
 * Lists the ids of the hint and error texts describing a form field, for `aria-describedby`.
 * @param id - Id of the field, the texts using `<id>-hint` and `<id>-error`
 * @param hint - Hint text, skipped when empty
 * @param error - Error text, skipped when empty
 * @returns Space-separated ids, or undefined when the field has neither text
 */
export const describedByIds = (id: string, hint: string, error: string): string | undefined => {
  const ids: string[] = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(
    value => value.length > 0,
  )
  return ids.length > 0 ? ids.join(' ') : undefined
}
