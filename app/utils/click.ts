/**
 * Tells whether a click on a link is a plain primary click, which the app may handle itself.
 * Modified or non-primary clicks keep the browser behaviour (new tab, new window, download).
 * @param event - Click event on the link
 * @returns True when no modifier key is held, the primary button is used and nothing prevented it
 */
export const isPlainLeftClick = (event: MouseEvent): boolean =>
  event.button === 0 &&
  !event.defaultPrevented &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey
