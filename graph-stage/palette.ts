/**
 * The colours of the graph stage. An app names its three brand colours, each with a lighter
 * shade, as CSS variables holding space-separated RGB (`--graph-1: 34 211 238`); the defaults
 * are in styles/graph-stage.css. The SVG and CSS pieces use the variables directly, and the
 * live canvas reads them once when it starts.
 */

export type Rgb = [number, number, number]

/** In palette order: each colour, then its lighter shade. */
export const PALETTE_VARS = [
  '--graph-1',
  '--graph-1-light',
  '--graph-2',
  '--graph-2-light',
  '--graph-3',
  '--graph-3-light',
] as const

/** The RoboSystems colours (cyan, blue, indigo), for where no variables are set. */
export const DEFAULT_PALETTE: Rgb[] = [
  [0.13, 0.83, 0.93],
  [0.4, 0.91, 0.98],
  [0.23, 0.48, 0.96],
  [0.38, 0.65, 0.98],
  [0.39, 0.4, 0.95],
  [0.51, 0.55, 0.97],
]

/** A palette colour as CSS, with an optional opacity. */
export const ink = (index: number, alpha?: number) =>
  `rgb(var(${PALETTE_VARS[index]})${alpha === undefined ? '' : ` / ${alpha}`})`

/** The palette an element inherits, as 0..1 channels; the default where a variable is unset. */
export function readPalette(el: Element): Rgb[] {
  const style = getComputedStyle(el)
  return PALETTE_VARS.map((name, i) => {
    const parts = style
      .getPropertyValue(name)
      .trim()
      .split(/[\s,]+/)
      .map(Number)
    return parts.length === 3 && parts.every(Number.isFinite)
      ? (parts.map((v) => v / 255) as Rgb)
      : DEFAULT_PALETTE[i]
  })
}
