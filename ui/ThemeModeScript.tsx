import type { ComponentPropsWithoutRef } from 'react'

export type ThemeMode = 'light' | 'dark' | 'auto'

/** The storage key flowbite-react used; kept so no user's choice resets on upgrade. */
export const THEME_MODE_STORAGE_KEY = 'flowbite-theme-mode'
export const DEFAULT_THEME_MODE: ThemeMode = 'auto'

export interface ThemeModeScriptProps extends ComponentPropsWithoutRef<'script'> {
  /** Force a mode regardless of storage. */
  mode?: ThemeMode
  /** Mode when storage holds nothing valid (default `auto`). */
  defaultMode?: ThemeMode
  localStorageKey?: string
  /** CSP nonce, when the app serves one. */
  nonce?: string
}

/**
 * Applies the stored (or system) color scheme before first paint by toggling
 * `dark` on the root element, and keeps it in sync with the system preference
 * and with other tabs. Render it in `<head>`; no client JS is needed for it.
 */
export function ThemeModeScript({
  mode,
  defaultMode = DEFAULT_THEME_MODE,
  localStorageKey = THEME_MODE_STORAGE_KEY,
  ...others
}: ThemeModeScriptProps) {
  return (
    <script
      {...others}
      data-theme-mode-script
      dangerouslySetInnerHTML={{
        __html: getThemeModeScript({ mode, defaultMode, localStorageKey }),
      }}
    />
  )
}

export function getThemeModeScript({
  mode,
  defaultMode = DEFAULT_THEME_MODE,
  localStorageKey = THEME_MODE_STORAGE_KEY,
}: Pick<
  ThemeModeScriptProps,
  'mode' | 'defaultMode' | 'localStorageKey'
> = {}) {
  return `
    try {
      const storageMode = window.localStorage.getItem("${localStorageKey}");
      const isStorageModeValid = storageMode === "light" || storageMode === "dark" || storageMode === "auto";
      const resolvedMode = (isStorageModeValid ? storageMode : null) ?? ${mode ? `"${mode}"` : undefined} ?? "${defaultMode}";
      const computedMode =
        resolvedMode === "auto" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : resolvedMode;
      const className = "dark";

      if (computedMode === "dark") {
        document.documentElement.classList.add(className);
      } else {
        document.documentElement.classList.remove(className);
      }
      localStorage.setItem("${localStorageKey}", resolvedMode);

      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", (e) => {
        const storageMode = window.localStorage.getItem("${localStorageKey}");
        const isStorageModeValid = storageMode === "light" || storageMode === "dark" || storageMode === "auto";
        const resolvedMode = isStorageModeValid ? storageMode : "${defaultMode}";

        if (resolvedMode === "auto") {
          if (e.matches) {
            document.documentElement.classList.add(className);
          } else {
            document.documentElement.classList.remove(className);
          }
        }
      });

      window.addEventListener("storage", (e) => {
        if (e.key === "${localStorageKey}") {
          const newMode = e.newValue;
          const isStorageModeValid = newMode === "light" || newMode === "dark" || newMode === "auto";
          const resolvedMode = isStorageModeValid ? newMode : "${defaultMode}";

          if (resolvedMode === "dark" || (resolvedMode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
            document.documentElement.classList.add(className);
          } else {
            document.documentElement.classList.remove(className);
          }
        }
      });
    } catch (e) {}
  `
}
