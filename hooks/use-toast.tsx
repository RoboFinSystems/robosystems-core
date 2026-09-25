'use client'

import { Toast, ToastToggle } from 'flowbite-react'
import { useCallback, useEffect, useId, useSyncExternalStore } from 'react'
import {
  HiCheckCircle,
  HiExclamation,
  HiInformationCircle,
} from 'react-icons/hi'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

// One store for the app: a toast raised anywhere shows in the one mounted
// container, however many components render one. Keeping the list per hook
// left every caller that never rendered its own container silent.
type Listener = () => void

let toasts: ToastMessage[] = []
let hosts: string[] = []
const listeners = new Set<Listener>()
const timeouts = new Map<string, ReturnType<typeof setTimeout>>()
const EMPTY: ToastMessage[] = []

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function removeToast(id: string) {
  const timeout = timeouts.get(id)
  if (timeout) {
    clearTimeout(timeout)
    timeouts.delete(id)
  }
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

function addToast(toast: Omit<ToastMessage, 'id'>) {
  const id = Math.random().toString(36).substring(2, 11)
  const newToast: ToastMessage = { id, duration: 5000, ...toast }
  toasts = [...toasts, newToast]
  emit()
  if (newToast.duration && newToast.duration > 0) {
    timeouts.set(
      id,
      setTimeout(() => removeToast(id), newToast.duration)
    )
  }
}

/** Test-only: clear the shared store between tests. */
export function resetToastsForTests() {
  timeouts.forEach(clearTimeout)
  timeouts.clear()
  toasts = []
  hosts = []
  emit()
}

const ICONS = {
  success: HiCheckCircle,
  error: HiExclamation,
  warning: HiExclamation,
  info: HiInformationCircle,
} as const

const COLORS = {
  success: 'success',
  error: 'failure',
  warning: 'warning',
  info: 'info',
} as const

const ICON_CLASSES = {
  success: 'bg-green-100 text-green-500 dark:bg-green-800 dark:text-green-200',
  error: 'bg-red-100 text-red-500 dark:bg-red-800 dark:text-red-200',
  warning:
    'bg-orange-100 text-orange-500 dark:bg-orange-700 dark:text-orange-200',
  info: 'bg-primary-100 text-primary-500 dark:bg-primary-800 dark:text-primary-200',
} as const

/** Renders the shared toasts, but only in the first mounted container. */
function SharedToastContainer() {
  const hostId = useId()
  useEffect(() => {
    hosts = [...hosts, hostId]
    emit()
    return () => {
      hosts = hosts.filter((h) => h !== hostId)
      emit()
    }
  }, [hostId])

  const current = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => EMPTY
  )
  const isHost = useSyncExternalStore(
    subscribe,
    () => hosts[0] === hostId,
    () => false
  )
  if (!isHost) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {current.map((toast) => {
        const Icon = ICONS[toast.type] ?? HiInformationCircle
        return (
          <Toast key={toast.id} className="min-w-80" color={COLORS[toast.type]}>
            <div
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ICON_CLASSES[toast.type]}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="ml-3 text-sm font-normal">{toast.message}</div>
            <ToastToggle onClick={() => removeToast(toast.id)} />
          </Toast>
        )
      })}
    </div>
  )
}

/**
 * Toast notifications on Flowbite React, shared across the app.
 *
 * Every call raises into one store, and the first mounted `ToastContainer`
 * renders it, so a component can raise a toast without rendering a
 * container of its own, and two containers never show a toast twice.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { showSuccess, ToastContainer } = useToast()
 *   return (
 *     <>
 *       <ToastContainer />
 *       <button onClick={() => showSuccess('Saved')}>Save</button>
 *     </>
 *   )
 * }
 * ```
 */
export function useToast() {
  const showSuccess = useCallback(
    (message: string, duration?: number) =>
      addToast({ type: 'success', message, duration }),
    []
  )
  const showError = useCallback(
    (message: string, duration?: number) =>
      addToast({ type: 'error', message, duration }),
    []
  )
  const showWarning = useCallback(
    (message: string, duration?: number) =>
      addToast({ type: 'warning', message, duration }),
    []
  )
  const showInfo = useCallback(
    (message: string, duration?: number) =>
      addToast({ type: 'info', message, duration }),
    []
  )

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    ToastContainer: SharedToastContainer,
  }
}
