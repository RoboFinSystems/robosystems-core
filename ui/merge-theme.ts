import { cn } from './cn'

type ThemeShape = { [key: string]: string | ThemeShape }

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string
    ? string
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}

/**
 * A per-call override merged over a component's resolved defaults: strings
 * merge with `cn`, objects merge key by key. This is the one piece of
 * flowbite-react's `theme` prop the apps actually used (a handful of call
 * sites override a nested slot such as a modal's inner panel); there is no
 * provider, store or resolver behind it.
 */
export function mergeTheme<T extends ThemeShape>(
  defaults: T,
  override?: DeepPartial<T>
): T {
  if (!override) return defaults
  const out: ThemeShape = { ...defaults }
  for (const key of Object.keys(override) as (keyof T)[]) {
    const base = defaults[key]
    const extra = (override as ThemeShape)[key as string]
    if (extra === undefined) continue
    if (typeof base === 'string' && typeof extra === 'string') {
      out[key as string] = cn(base, extra)
    } else if (typeof base === 'object' && typeof extra === 'object') {
      out[key as string] = mergeTheme(base, extra as DeepPartial<typeof base>)
    }
  }
  return out as T
}
