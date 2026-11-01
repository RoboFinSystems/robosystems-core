'use client'

import {
  createContext,
  forwardRef,
  useContext,
  useState,
  type ComponentPropsWithoutRef,
  type FC,
  type MouseEvent,
} from 'react'
import { cn } from './cn'
import { XIcon } from './icons'
import { themeDefaults } from './theme-defaults'

const t = themeDefaults.toast

const durationClasses = {
  75: 'duration-75',
  100: 'duration-100',
  150: 'duration-150',
  200: 'duration-200',
  300: 'duration-300',
  500: 'duration-500',
  700: 'duration-700',
  1000: 'duration-1000',
} as const
export type ToastDuration = keyof typeof durationClasses

interface ToastContextValue {
  duration: ToastDuration
  isClosed: boolean
  isRemoved: boolean
  setIsClosed: (v: boolean) => void
  setIsRemoved: (v: boolean) => void
}
const ToastContext = createContext<ToastContextValue | undefined>(undefined)
function useToastContext() {
  const context = useContext(ToastContext)
  if (!context)
    throw new Error(
      'useToastContext should be used within the ToastContext provider!'
    )
  return context
}

export interface ToastProps extends ComponentPropsWithoutRef<'div'> {
  duration?: ToastDuration
}

const ToastRoot = forwardRef<HTMLDivElement, ToastProps>(function Toast(
  { className, duration = 300, ...rest },
  ref
) {
  const [isClosed, setIsClosed] = useState(false)
  const [isRemoved, setIsRemoved] = useState(false)
  if (isRemoved) return null
  return (
    <ToastContext.Provider
      value={{ duration, isClosed, isRemoved, setIsClosed, setIsRemoved }}
    >
      <div
        ref={ref}
        data-testid="flowbite-toast"
        role="alert"
        className={cn(
          t.root.base,
          durationClasses[duration],
          isClosed && t.root.closed,
          className
        )}
        {...rest}
      />
    </ToastContext.Provider>
  )
})

export interface ToastToggleProps extends ComponentPropsWithoutRef<'button'> {
  onDismiss?: () => void
  xIcon?: FC<ComponentPropsWithoutRef<'svg'>>
}

export const ToastToggle = forwardRef<HTMLButtonElement, ToastToggleProps>(
  function ToastToggle(
    { className, onClick, onDismiss, xIcon: Icon = XIcon, ...rest },
    ref
  ) {
    const { duration, isClosed, isRemoved, setIsClosed, setIsRemoved } =
      useToastContext()
    function handleClick(e: MouseEvent<HTMLButtonElement>) {
      onClick?.(e)
      if (onDismiss) {
        onDismiss()
        return
      }
      setIsClosed(!isClosed)
      setTimeout(() => setIsRemoved(!isRemoved), duration)
    }
    return (
      <button
        ref={ref}
        aria-label="Close"
        onClick={handleClick}
        type="button"
        className={cn(t.toggle.base, className)}
        {...rest}
      >
        <Icon aria-hidden className={t.toggle.icon} />
      </button>
    )
  }
)

export const Toast = Object.assign(ToastRoot, { Toggle: ToastToggle })
