'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HiChevronDown,
  HiChevronUp,
  HiOutlineArrowsExpand,
  HiOutlineMinus,
  HiTerminal,
} from 'react-icons/hi'

import {
  CONSOLE_DRAWER_STORAGE_KEY,
  CONSOLE_OPEN_EVENT,
} from '../../lib/console-drawer'
import { ConsoleContent } from './ConsoleContent'
import type { ConsoleConfig } from './types'

const STORAGE_KEY = CONSOLE_DRAWER_STORAGE_KEY
/** Height of the closed drawer's bar. */
export const CONSOLE_DRAWER_BAR_HEIGHT = 32
/** Set on <html> to the space the drawer covers; pad page content by it. */
export const CONSOLE_DRAWER_HEIGHT_VAR = '--console-drawer-height'
const DEFAULT_HEIGHT = 320
const MIN_HEIGHT = 160
// Leave the page's own header in view at full stretch.
const MAX_HEIGHT_RATIO = 0.8

interface DrawerState {
  open: boolean
  height: number
}

function readState(): DrawerState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DrawerState>
      return {
        open: parsed.open === true,
        height:
          typeof parsed.height === 'number' ? parsed.height : DEFAULT_HEIGHT,
      }
    }
  } catch {
    // Storage blocked or corrupt: start closed at the default height.
  }
  return { open: false, height: DEFAULT_HEIGHT }
}

function writeState(state: DrawerState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Not persisting is fine; the drawer still works for this page view.
  }
}

function clampHeight(height: number): number {
  const max = Math.floor(window.innerHeight * MAX_HEIGHT_RATIO)
  return Math.min(Math.max(height, MIN_HEIGHT), Math.max(max, MIN_HEIGHT))
}

/**
 * The console as a bottom panel, like VS Code's: a thin bar when closed, a
 * resizable panel when open, toggled with Ctrl+`. It stays mounted once
 * opened, so the conversation survives closing it. `className` positions it,
 * e.g. an offset for the app's sidebar.
 */
export function ConsoleDrawer({
  config,
  className = 'left-0 right-0',
}: {
  config: ConsoleConfig
  className?: string
}) {
  const [state, setState] = useState<DrawerState>({
    open: false,
    height: DEFAULT_HEIGHT,
  })
  // Mount the console on first open, then keep it.
  const [hasOpened, setHasOpened] = useState(false)
  const dragging = useRef(false)
  // The height to return to when a maximized drawer is restored.
  const restoreHeight = useRef(DEFAULT_HEIGHT)

  useEffect(() => {
    const stored = readState()
    setState({ ...stored, height: clampHeight(stored.height) })
    if (stored.open) setHasOpened(true)
  }, [])

  const toggle = useCallback(() => {
    setState((prev) => {
      const merged = { ...prev, open: !prev.open }
      writeState(merged)
      return merged
    })
    setHasOpened(true)
  }, [])

  useEffect(() => {
    const covered = state.open ? state.height : CONSOLE_DRAWER_BAR_HEIGHT
    document.documentElement.style.setProperty(
      CONSOLE_DRAWER_HEIGHT_VAR,
      `${covered}px`
    )
  }, [state.open, state.height])

  useEffect(
    () => () => {
      document.documentElement.style.removeProperty(CONSOLE_DRAWER_HEIGHT_VAR)
    },
    []
  )

  // openConsoleDrawer() from any button or page.
  useEffect(() => {
    const onOpen = () => {
      setState((prev) => {
        if (prev.open) return prev
        const merged = { ...prev, open: true }
        writeState(merged)
        return merged
      })
      setHasOpened(true)
    }
    window.addEventListener(CONSOLE_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(CONSOLE_OPEN_EVENT, onOpen)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === '`') {
        event.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  const setHeight = (height: number) => {
    setState((prev) => {
      const merged = { ...prev, height: clampHeight(height) }
      writeState(merged)
      return merged
    })
  }

  const isMaximized =
    typeof window !== 'undefined' &&
    state.height >= clampHeight(Number.POSITIVE_INFINITY)

  const toggleMaximized = () => {
    if (isMaximized) {
      setHeight(restoreHeight.current)
    } else {
      restoreHeight.current = state.height
      setHeight(Number.POSITIVE_INFINITY)
    }
  }

  const onResizeStart = (event: React.PointerEvent) => {
    event.preventDefault()
    dragging.current = true
    const onMove = (move: PointerEvent) => {
      if (!dragging.current) return
      setState((prev) => ({
        ...prev,
        height: clampHeight(window.innerHeight - move.clientY),
      }))
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setState((prev) => {
        writeState(prev)
        return prev
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div
      className={`fixed bottom-0 z-30 flex flex-col border-t border-gray-800 bg-gray-950 shadow-2xl ${className}`}
      style={{ height: state.open ? state.height : undefined }}
      data-testid="console-drawer"
    >
      {state.open && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize console"
          onPointerDown={onResizeStart}
          onDoubleClick={() => setHeight(DEFAULT_HEIGHT)}
          title="Drag to resize; double-click to reset"
          className="h-1 shrink-0 cursor-row-resize bg-gray-800 hover:bg-cyan-700"
        />
      )}
      <div className="flex h-8 shrink-0 items-center text-xs text-gray-400">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={state.open}
          className="flex h-full flex-1 items-center gap-2 px-3 hover:text-gray-200"
        >
          <HiTerminal className="h-4 w-4" />
          <span className="font-medium tracking-wider uppercase">Console</span>
          <span className="text-gray-600">Ctrl+`</span>
          <span className="ml-auto">
            {state.open ? (
              <HiChevronDown className="h-4 w-4" />
            ) : (
              <HiChevronUp className="h-4 w-4" />
            )}
          </span>
        </button>
        {state.open && (
          <button
            type="button"
            onClick={toggleMaximized}
            aria-label={
              isMaximized ? 'Restore console size' : 'Maximize console'
            }
            title={isMaximized ? 'Restore' : 'Maximize'}
            className="flex h-full items-center px-3 hover:text-gray-200"
          >
            {isMaximized ? (
              <HiOutlineMinus className="h-4 w-4" />
            ) : (
              <HiOutlineArrowsExpand className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {hasOpened && (
        <div className={`min-h-0 flex-1 ${state.open ? '' : 'hidden'}`}>
          <ConsoleContent config={config} variant="panel" />
        </div>
      )}
    </div>
  )
}
