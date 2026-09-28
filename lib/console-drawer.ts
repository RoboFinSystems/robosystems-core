/** Window event that opens the console drawer from anywhere in an app. */
export const CONSOLE_OPEN_EVENT = 'robosystems:console-open'

/** Where the drawer keeps whether it is open and its height. */
export const CONSOLE_DRAWER_STORAGE_KEY = 'robosystems:console-drawer'

/**
 * Open the console drawer: the one way into the console, from any page.
 *
 * Records the open state as well as signalling it, so a call made before
 * the drawer has mounted (a page's effect runs before its layout's) is
 * still honoured when the drawer reads its state.
 */
export function openConsoleDrawer(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(CONSOLE_DRAWER_STORAGE_KEY)
    const state = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    window.localStorage.setItem(
      CONSOLE_DRAWER_STORAGE_KEY,
      JSON.stringify({ ...state, open: true })
    )
  } catch {
    // Storage unavailable: the event alone opens a mounted drawer.
  }
  window.dispatchEvent(new Event(CONSOLE_OPEN_EVENT))
}
