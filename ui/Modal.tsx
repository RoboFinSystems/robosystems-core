'use client'

import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useMergeRefs,
  useRole,
} from '@floating-ui/react'
import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useLayoutEffect,
  useState,
  type ComponentPropsWithoutRef,
  type ElementType,
  type MutableRefObject,
} from 'react'
import { cn } from './cn'
import { OutlineXIcon } from './icons'
import { mergeTheme, type DeepPartial } from './merge-theme'
import { themeDefaults } from './theme-defaults'
import type { DynamicStringEnumKeysOf } from './types'

const defaults = themeDefaults.modal
export type ModalTheme = DeepPartial<typeof defaults>

interface ModalContextValue {
  t: typeof defaults
  popup?: boolean
  dismissible?: boolean
  onClose?: () => void
  setHeaderId: (id: string | undefined) => void
}
const ModalContext = createContext<ModalContextValue | undefined>(undefined)
function useModalContext() {
  const context = useContext(ModalContext)
  if (!context)
    throw new Error(
      'useModalContext should be used within the ModalContext provider!'
    )
  return context
}

export type ModalPosition = DynamicStringEnumKeysOf<
  typeof defaults.root.positions
>
export type ModalSize = DynamicStringEnumKeysOf<typeof defaults.root.sizes>

export interface ModalProps extends ComponentPropsWithoutRef<'div'> {
  dismissible?: boolean
  onClose?: () => void
  popup?: boolean
  position?: ModalPosition
  root?: HTMLElement | null
  show?: boolean
  size?: ModalSize
  initialFocus?: number | MutableRefObject<HTMLElement | null>
  /** Per-call override merged over the defaults (strings merge with cn). */
  theme?: ModalTheme
}

const ModalRoot = forwardRef<HTMLDivElement, ModalProps>(function Modal(
  {
    children,
    className,
    dismissible = false,
    onClose,
    popup,
    position = 'center',
    root,
    show,
    size = '2xl',
    initialFocus,
    theme,
    ...rest
  },
  ref
) {
  const t = mergeTheme(defaults, theme)
  const [headerId, setHeaderId] = useState<string | undefined>(undefined)
  const { context } = useFloating({
    open: show,
    onOpenChange: () => onClose?.(),
  })
  const mergedRef = useMergeRefs([context.refs.setFloating, ref])
  const click = useClick(context)
  const dismiss = useDismiss(context, {
    outsidePressEvent: 'mousedown',
    enabled: dismissible,
  })
  const role = useRole(context)
  const { getFloatingProps } = useInteractions([click, dismiss, role])

  if (!show) return null

  return (
    <ModalContext.Provider
      value={{ t, popup, dismissible, onClose, setHeaderId }}
    >
      <FloatingPortal root={root}>
        <FloatingOverlay
          lockScroll
          data-testid="modal-overlay"
          className={cn(
            t.root.base,
            t.root.positions[position as keyof typeof defaults.root.positions],
            show ? t.root.show.on : t.root.show.off,
            className
          )}
          {...rest}
        >
          <FloatingFocusManager context={context} initialFocus={initialFocus}>
            <div
              ref={mergedRef}
              {...getFloatingProps(rest)}
              aria-labelledby={headerId}
              className={cn(
                t.content.base,
                t.root.sizes[size as keyof typeof defaults.root.sizes]
              )}
            >
              <div className={t.content.inner}>{children}</div>
            </div>
          </FloatingFocusManager>
        </FloatingOverlay>
      </FloatingPortal>
    </ModalContext.Provider>
  )
})

export interface ModalHeaderProps extends ComponentPropsWithoutRef<'div'> {
  as?: ElementType
}

export const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  function ModalHeader(
    { as: Component = 'h3', children, className, id, ...rest },
    ref
  ) {
    const { t, popup, dismissible, onClose, setHeaderId } = useModalContext()
    const innerHeaderId = useId()
    const headerId = id || innerHeaderId
    useLayoutEffect(() => {
      setHeaderId(headerId)
      return () => setHeaderId(undefined)
    }, [headerId, setHeaderId])
    return (
      <div
        ref={ref}
        className={cn(t.header.base, popup && t.header.popup, className)}
        {...rest}
      >
        <Component id={headerId} className={t.header.title}>
          {children}
        </Component>
        {dismissible && (
          <button
            aria-label="Close"
            className={t.header.close.base}
            type="button"
            onClick={onClose}
          >
            <OutlineXIcon aria-hidden className={t.header.close.icon} />
          </button>
        )}
      </div>
    )
  }
)

export type ModalBodyProps = ComponentPropsWithoutRef<'div'>
export const ModalBody = forwardRef<HTMLDivElement, ModalBodyProps>(
  function ModalBody({ className, ...rest }, ref) {
    const { t, popup } = useModalContext()
    return (
      <div
        ref={ref}
        className={cn(t.body.base, popup && t.body.popup, className)}
        {...rest}
      />
    )
  }
)

export type ModalFooterProps = ComponentPropsWithoutRef<'div'>
export const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  function ModalFooter({ className, ...rest }, ref) {
    const { t, popup } = useModalContext()
    return (
      <div
        ref={ref}
        className={cn(t.footer.base, !popup && t.footer.popup, className)}
        {...rest}
      />
    )
  }
)

export const Modal = Object.assign(ModalRoot, {
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
})
