/** Window event that opens the console drawer from anywhere in an app. */
export const CONSOLE_OPEN_EVENT = 'robosystems:console-open'

/** Open the console drawer: the one way into the console, from any page. */
export function openConsoleDrawer(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(CONSOLE_OPEN_EVENT))
}
