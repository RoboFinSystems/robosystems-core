'use client'

import {
  arrow,
  autoPlacement,
  autoUpdate,
  flip,
  offset,
  safePolygon,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
  type FloatingContext,
  type Placement,
} from '@floating-ui/react'
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { cn } from './cn'

export type FloatingPlacement = 'auto' | Placement
export type FloatingTrigger = 'hover' | 'click'
export type FloatingStyle = 'dark' | 'light' | 'auto'

/** The theme shape Tooltip and Dropdown's floating layer share. */
export interface FloatingTheme {
  target: string
  base: string
  animation: string
  hidden: string
  style: { dark: string; light: string; auto: string }
  content: string
  arrow: {
    base: string
    style: { dark: string; light: string; auto: string }
    placement: string
  }
}

export function getMiddleware({
  arrowRef,
  placement,
}: {
  arrowRef?: RefObject<HTMLDivElement | null>
  placement: FloatingPlacement
}) {
  const middleware = [
    offset(8),
    placement === 'auto' ? autoPlacement() : flip(),
    shift({ padding: 8 }),
  ]
  if (arrowRef?.current) middleware.push(arrow({ element: arrowRef.current }))
  return middleware
}

export function useBaseFloating({
  open,
  arrowRef,
  placement = 'top',
  setOpen,
}: {
  open: boolean
  arrowRef?: RefObject<HTMLDivElement | null>
  placement?: FloatingPlacement
  setOpen: (open: boolean) => void
}) {
  return useFloating({
    placement: placement === 'auto' ? undefined : placement,
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    middleware: getMiddleware({ placement, arrowRef }),
  })
}

export function useFloatingInteractions({
  context,
  trigger,
  role = 'tooltip',
  interactions = [],
}: {
  context: FloatingContext
  trigger: FloatingTrigger
  role?: 'tooltip' | 'menu'
  interactions?: Parameters<typeof useInteractions>[0]
}) {
  return useInteractions([
    useClick(context, { enabled: trigger === 'click' }),
    useHover(context, {
      enabled: trigger === 'hover',
      handleClose: safePolygon(),
    }),
    useDismiss(context),
    useRole(context, { role }),
    ...interactions,
  ])
}

const arrowSide = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
} as const
export function getArrowPlacement(placement: Placement) {
  return arrowSide[placement.split('-')[0] as keyof typeof arrowSide]
}

export interface FloatingProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'content' | 'style'
> {
  animation?: false | `duration-${number}`
  arrow?: boolean
  content: ReactNode
  placement?: FloatingPlacement
  style?: FloatingStyle
  theme: FloatingTheme
  trigger?: FloatingTrigger
  minWidth?: number
}

export function Floating({
  animation = 'duration-300',
  arrow = true,
  children,
  className,
  content,
  placement = 'top',
  style = 'dark',
  theme,
  trigger = 'hover',
  minWidth,
  ...props
}: FloatingProps) {
  const arrowRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const floatingProperties = useBaseFloating({
    open,
    placement,
    arrowRef,
    setOpen,
  })
  const {
    context,
    middlewareData: { arrow: { x: arrowX, y: arrowY } = {} },
    refs,
    strategy,
    update,
    x,
    y,
  } = floatingProperties
  const focus = useFocus(context)
  const { getFloatingProps, getReferenceProps } = useFloatingInteractions({
    context,
    role: 'tooltip',
    trigger,
    interactions: [focus],
  })

  useEffect(() => {
    if (refs.reference.current && refs.floating.current && open) {
      return autoUpdate(refs.reference.current, refs.floating.current, update)
    }
  }, [open, refs.floating, refs.reference, update])

  return (
    <>
      <div
        ref={refs.setReference}
        className={theme.target}
        data-testid="flowbite-tooltip-target"
        {...getReferenceProps()}
      >
        {children}
      </div>
      <div
        ref={refs.setFloating}
        data-testid="flowbite-tooltip"
        {...getFloatingProps({
          className: cn(
            theme.base,
            animation && `${theme.animation} ${animation}`,
            !open && theme.hidden,
            theme.style[style],
            className
          ),
          style: {
            position: strategy,
            top: y ?? ' ',
            left: x ?? ' ',
            minWidth,
          },
          ...props,
        })}
      >
        <div className={theme.content}>{content}</div>
        {arrow && (
          <div
            className={cn(
              theme.arrow.base,
              style === 'dark' && theme.arrow.style.dark,
              style === 'light' && theme.arrow.style.light,
              style === 'auto' && theme.arrow.style.auto
            )}
            data-testid="flowbite-tooltip-arrow"
            ref={arrowRef}
            style={{
              top: arrowY ?? ' ',
              left: arrowX ?? ' ',
              right: ' ',
              bottom: ' ',
              [getArrowPlacement(floatingProperties.placement)]:
                theme.arrow.placement,
            }}
          >
            &nbsp;
          </div>
        )}
      </div>
    </>
  )
}
