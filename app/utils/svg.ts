/**
 * Turns an SVG markup string into a source usable by an `<img>` element.
 * @param svg - SVG markup
 * @returns Data URI of the SVG
 */
export const toSvgDataUri = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
