'use client'

import {
  forwardRef,
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type FC,
} from 'react'
import { cn } from './cn'
import { MoonIcon, SunIcon } from './icons'
import { themeDefaults } from './theme-defaults'
import {
  DEFAULT_THEME_MODE,
  THEME_MODE_STORAGE_KEY,
  type ThemeMode,
} from './ThemeModeScript'

const SYNC_THEME_MODE = 'flowbite-theme-mode-sync'

const isClient = () => typeof window !== 'undefined'

function validateMode(mode: string | null | undefined): ThemeMode {
  return mode === 'light' || mode === 'dark' || mode === 'auto'
    ? mode
    : DEFAULT_THEME_MODE
}
function prefersColorScheme(): 'light' | 'dark' {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}
function computeModeValue(mode: ThemeMode): ThemeMode {
  if (!isClient()) return DEFAULT_THEME_MODE
  return mode === 'auto' ? prefersColorScheme() : mode
}
function getInitialMode(): ThemeMode {
  if (!isClient()) return DEFAULT_THEME_MODE
  return validateMode(localStorage.getItem(THEME_MODE_STORAGE_KEY))
}
function setModeInDOM(mode: ThemeMode) {
  if (computeModeValue(mode) === 'dark')
    document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
}

/** Reads and sets the color scheme, synced across tabs and with the system preference. */
export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode)

  useEffect(() => {
    function handleStorage({ key, newValue }: StorageEvent) {
      if (key === THEME_MODE_STORAGE_KEY) setMode(validateMode(newValue))
    }
    function handleSync(e: Event) {
      setMode((e as CustomEvent<ThemeMode>).detail)
    }
    window.addEventListener('storage', handleStorage)
    document.addEventListener(SYNC_THEME_MODE, handleSync)
    return () => {
      window.removeEventListener('storage', handleStorage)
      document.removeEventListener(SYNC_THEME_MODE, handleSync)
    }
  }, [])

  function handleSetMode(next: ThemeMode) {
    setMode(next)
    localStorage.setItem(THEME_MODE_STORAGE_KEY, next)
    setModeInDOM(next)
    document.dispatchEvent(new CustomEvent(SYNC_THEME_MODE, { detail: next }))
  }
  function toggleMode() {
    const current = mode === 'auto' ? computeModeValue(mode) : mode
    handleSetMode(current === 'dark' ? 'light' : 'dark')
  }
  function clearMode() {
    handleSetMode(mode ?? DEFAULT_THEME_MODE)
  }

  return {
    mode,
    computedMode: computeModeValue(mode),
    setMode: handleSetMode,
    toggleMode,
    clearMode,
  }
}

const t = themeDefaults.darkThemeToggle

export interface DarkThemeToggleProps extends ComponentPropsWithoutRef<'button'> {
  iconDark?: FC<ComponentPropsWithoutRef<'svg'>>
  iconLight?: FC<ComponentPropsWithoutRef<'svg'>>
}

export const DarkThemeToggle = forwardRef<
  HTMLButtonElement,
  DarkThemeToggleProps
>(function DarkThemeToggle(
  {
    className,
    iconDark: IconDark = SunIcon,
    iconLight: IconLight = MoonIcon,
    ...rest
  },
  ref
) {
  const { toggleMode } = useThemeMode()
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Toggle dark mode"
      data-testid="dark-theme-toggle"
      className={cn(t.root.base, className)}
      onClick={toggleMode}
      {...rest}
    >
      <IconDark
        aria-label="Currently dark mode"
        className={cn(t.root.icon.base, t.root.icon.dark)}
      />
      <IconLight
        aria-label="Currently light mode"
        className={cn(t.root.icon.base, t.root.icon.light)}
      />
    </button>
  )
})
