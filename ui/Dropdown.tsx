'use client'

import {
  FloatingFocusManager,
  FloatingList,
  useListItem,
  useListNavigation,
  useMergeRefs,
  useTypeahead,
  type ReferenceType,
  type UseFloatingReturn,
  type UseInteractionsReturn,
} from '@floating-ui/react'
import {
  cloneElement,
  createContext,
  createElement,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementType,
  type FC,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Button, type ButtonProps } from './Button'
import { cn } from './cn'
import {
  useBaseFloating,
  useFloatingInteractions,
  type FloatingPlacement,
  type FloatingTrigger,
} from './Floating'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from './icons'
import { themeDefaults } from './theme-defaults'

const t = themeDefaults.dropdown

interface DropdownContextValue {
  activeIndex: number | null
  dismissOnClick?: boolean
  getItemProps: UseInteractionsReturn['getItemProps']
  handleSelect: (index: number | null) => void
}
const DropdownContext = createContext<DropdownContextValue | undefined>(
  undefined
)
function useDropdownContext() {
  const context = useContext(DropdownContext)
  if (!context)
    throw new Error(
      'useDropdownContext should be used within the DropdownContext provider!'
    )
  return context
}

const icons = {
  top: ChevronUpIcon,
  right: ChevronRightIcon,
  bottom: ChevronDownIcon,
  left: ChevronLeftIcon,
}

export interface DropdownProps extends Omit<ButtonProps, 'children' | 'label'> {
  arrowIcon?: boolean
  dismissOnClick?: boolean
  enableTypeAhead?: boolean
  inline?: boolean
  label: ReactNode
  placement?: FloatingPlacement
  trigger?: FloatingTrigger
  renderTrigger?: (theme: typeof t) => ReactElement<Record<string, unknown>>
  'data-testid'?: string
  children?: ReactNode
}

interface TriggerProps extends Omit<ButtonProps, 'children'> {
  refs: UseFloatingReturn<ReferenceType>['refs']
  inline?: boolean
  setButtonWidth: (width: number) => void
  getReferenceProps: UseInteractionsReturn['getReferenceProps']
  renderTrigger?: DropdownProps['renderTrigger']
  children: ReactNode
}

function Trigger({
  refs,
  children,
  inline,
  disabled,
  setButtonWidth,
  getReferenceProps,
  renderTrigger,
  ...buttonProps
}: TriggerProps) {
  const ref = refs.reference
  const a11yProps = getReferenceProps()
  useEffect(() => {
    if (ref.current) setButtonWidth((ref.current as HTMLElement).clientWidth)
  }, [ref, setButtonWidth])
  if (renderTrigger) {
    const triggerElement = renderTrigger(t)
    return cloneElement(triggerElement, {
      ref: refs.setReference,
      disabled,
      ...a11yProps,
      ...triggerElement.props,
    })
  }
  return inline ? (
    <button
      type="button"
      ref={refs.setReference}
      className={t.inlineWrapper}
      disabled={disabled}
      {...a11yProps}
    >
      {children}
    </button>
  ) : (
    <Button
      {...buttonProps}
      disabled={disabled}
      type="button"
      ref={refs.setReference}
      {...a11yProps}
    >
      {children}
    </Button>
  )
}

const DropdownRoot = function Dropdown({
  children,
  className,
  dismissOnClick = true,
  enableTypeAhead = true,
  renderTrigger,
  inline,
  placement = inline ? 'bottom-start' : 'bottom',
  trigger = 'click',
  label,
  arrowIcon = true,
  ...buttonProps
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [buttonWidth, setButtonWidth] = useState<number | undefined>(undefined)
  const elementsRef = useRef<(HTMLElement | null)[]>([])
  const labelsRef = useRef<(string | null)[]>([])
  const dataTestId = buttonProps['data-testid'] || 'flowbite-dropdown-target'

  const handleSelect = useCallback((index: number | null) => {
    setSelectedIndex(index)
    setOpen(false)
  }, [])
  const handleTypeaheadMatch = useCallback(
    (index: number | null) => {
      if (open) setActiveIndex(index)
      else handleSelect(index)
    },
    [open, handleSelect]
  )

  const { context, floatingStyles, refs } = useBaseFloating({
    open,
    setOpen,
    placement,
  })
  const listNav = useListNavigation(context, {
    listRef: elementsRef,
    activeIndex,
    selectedIndex,
    onNavigate: setActiveIndex,
  })
  const typeahead = useTypeahead(context, {
    listRef: labelsRef,
    activeIndex,
    selectedIndex,
    onMatch: handleTypeaheadMatch,
    enabled: enableTypeAhead,
  })
  const { getReferenceProps, getFloatingProps, getItemProps } =
    useFloatingInteractions({
      context,
      role: 'menu',
      trigger,
      interactions: [listNav, typeahead],
    })

  const Icon = useMemo(() => {
    const [p] = placement.split('-')
    return icons[p as keyof typeof icons] ?? ChevronDownIcon
  }, [placement])

  return (
    <DropdownContext.Provider
      value={{ activeIndex, dismissOnClick, getItemProps, handleSelect }}
    >
      <Trigger
        {...buttonProps}
        refs={refs}
        inline={inline}
        data-testid={dataTestId}
        className={cn(t.floating.target, className)}
        setButtonWidth={setButtonWidth}
        getReferenceProps={getReferenceProps}
        renderTrigger={renderTrigger}
      >
        {label}
        {arrowIcon && <Icon className={t.arrowIcon} />}
      </Trigger>
      {open && (
        <FloatingFocusManager context={context} modal={false}>
          <div
            ref={refs.setFloating}
            style={{ ...floatingStyles, minWidth: buttonWidth }}
            data-testid="flowbite-dropdown"
            aria-expanded={open}
            {...getFloatingProps({
              className: cn(
                t.floating.base,
                t.floating.animation,
                'duration-100',
                !open && t.floating.hidden,
                t.floating.style.auto,
                className
              ),
            })}
          >
            <FloatingList elementsRef={elementsRef} labelsRef={labelsRef}>
              <ul className={t.content} tabIndex={-1}>
                {children}
              </ul>
            </FloatingList>
          </div>
        </FloatingFocusManager>
      )}
    </DropdownContext.Provider>
  )
}

export interface DropdownItemProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'onClick'
> {
  as?: ElementType
  href?: string
  target?: string
  rel?: string
  icon?: FC<ComponentPropsWithoutRef<'svg'>>
  onClick?: () => void
}

export const DropdownItem = forwardRef<HTMLButtonElement, DropdownItemProps>(
  function DropdownItem(
    {
      children,
      className,
      icon: Icon,
      onClick,
      as: Component,
      href,
      type = 'button',
      ...rest
    },
    forwardedRef
  ) {
    const { activeIndex, dismissOnClick, getItemProps, handleSelect } =
      useDropdownContext()
    const { ref: listItemRef, index } = useListItem({
      label: typeof children === 'string' ? children : undefined,
    })
    const ref = useMergeRefs([forwardedRef, listItemRef])
    const isActive = activeIndex === index
    const Base = Component ?? (href ? 'a' : 'button')
    return (
      <li role="menuitem" className={t.floating.item.container}>
        {createElement(
          Base,
          {
            ref,
            href,
            type,
            className: cn(t.floating.item.base, className),
            ...rest,
            ...getItemProps({
              onClick: () => {
                onClick?.()
                if (dismissOnClick) handleSelect(null)
              },
            }),
            tabIndex: isActive ? 0 : -1,
          },
          Icon && <Icon className={t.floating.item.icon} />,
          children
        )}
      </li>
    )
  }
)

export type DropdownHeaderProps = ComponentPropsWithoutRef<'div'>
export const DropdownHeader = forwardRef<HTMLDivElement, DropdownHeaderProps>(
  function DropdownHeader({ className, ...rest }, ref) {
    useDropdownContext()
    return (
      <div ref={ref} className={cn(t.floating.header, className)} {...rest} />
    )
  }
)

export type DropdownDividerProps = ComponentPropsWithoutRef<'div'>
export const DropdownDivider = forwardRef<HTMLDivElement, DropdownDividerProps>(
  function DropdownDivider({ className, ...rest }, ref) {
    useDropdownContext()
    return (
      <div ref={ref} className={cn(t.floating.divider, className)} {...rest} />
    )
  }
)

export const Dropdown = Object.assign(DropdownRoot, {
  Item: DropdownItem,
  Header: DropdownHeader,
  Divider: DropdownDivider,
})
