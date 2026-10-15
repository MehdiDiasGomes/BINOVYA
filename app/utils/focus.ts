const FOCUSABLE_SELECTOR = 'input:not([type="hidden"]), select, textarea, button, a[href]'

/**
 * Moves keyboard focus to the first element found among the given ids, in order. When the
 * element is a group such as a fieldset, focus goes to its first control instead.
 * @param ids - Element ids, from the most to the least prioritary
 */
export const focusFirstElement = (ids: string[]): void => {
  const target: HTMLElement | undefined = ids
    .map(id => document.getElementById(id))
    .find((element): element is HTMLElement => element !== null)
  const control: HTMLElement | null | undefined =
    target instanceof HTMLFieldSetElement
      ? target.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      : target
  control?.focus()
}
