'use client'

import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type ElementType,
  type FC,
  type ReactNode,
} from 'react'
import { Badge, type BadgeColor } from './Badge'
import { cn } from './cn'
import { ChevronDownIcon } from './icons'
import { themeDefaults } from './theme-defaults'
import { Tooltip } from './Tooltip'

const t = themeDefaults.sidebar

interface SidebarContextValue {
  isCollapsed: boolean
}
const SidebarContext = createContext<SidebarContextValue | undefined>(undefined)
function useSidebarContext() {
  const context = useContext(SidebarContext)
  if (!context)
    throw new Error(
      'useSidebarContext should be used within the SidebarContext provider!'
    )
  return context
}
const SidebarItemContext = createContext<
  { isInsideCollapse: boolean } | undefined
>(undefined)
function useSidebarItemContext() {
  const context = useContext(SidebarItemContext)
  if (!context)
    throw new Error(
      'useSidebarItemContext should be used within the SidebarItemContext provider!'
    )
  return context
}

export interface SidebarProps extends ComponentPropsWithoutRef<'nav'> {
  as?: ElementType
  collapseBehavior?: 'collapse' | 'hide'
  collapsed?: boolean
}

const SidebarRoot = forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  {
    as: Component = 'nav',
    children,
    className,
    collapseBehavior = 'collapse',
    collapsed: isCollapsed = false,
    ...rest
  },
  ref
) {
  return (
    <SidebarContext.Provider value={{ isCollapsed }}>
      <Component
        ref={ref}
        aria-label="Sidebar"
        hidden={isCollapsed && collapseBehavior === 'hide'}
        className={cn(
          t.root.base,
          t.root.collapsed[isCollapsed ? 'on' : 'off'],
          className
        )}
        {...rest}
      >
        <div className={t.root.inner}>{children}</div>
      </Component>
    </SidebarContext.Provider>
  )
})

export type SidebarItemsProps = ComponentPropsWithoutRef<'div'>
export const SidebarItems = forwardRef<HTMLDivElement, SidebarItemsProps>(
  function SidebarItems({ className, ...rest }, ref) {
    useSidebarContext()
    return (
      <div
        ref={ref}
        className={cn(t.items.base, className)}
        data-testid="flowbite-sidebar-items"
        {...rest}
      />
    )
  }
)

export type SidebarItemGroupProps = ComponentPropsWithoutRef<'ul'>
export const SidebarItemGroup = forwardRef<
  HTMLUListElement,
  SidebarItemGroupProps
>(function SidebarItemGroup({ className, ...rest }, ref) {
  useSidebarContext()
  return (
    <SidebarItemContext.Provider value={{ isInsideCollapse: false }}>
      <ul
        ref={ref}
        data-testid="flowbite-sidebar-item-group"
        className={cn(t.itemGroup.base, className)}
        {...rest}
      />
    </SidebarItemContext.Provider>
  )
})

export interface SidebarItemProps extends Omit<
  ComponentPropsWithoutRef<'a'>,
  'label'
> {
  active?: boolean
  as?: ElementType
  href?: string
  icon?: FC<ComponentPropsWithoutRef<'svg'>>
  label?: ReactNode
  labelColor?: BadgeColor
}

function ItemContent({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span
      data-testid="flowbite-sidebar-item-content"
      id={`flowbite-sidebar-item-${id}`}
      className={cn(t.item.content.base)}
    >
      {children}
    </span>
  )
}

export const SidebarItem = forwardRef<HTMLAnchorElement, SidebarItemProps>(
  function SidebarItem(
    {
      active: isActive,
      as: Component = 'a',
      children,
      className,
      icon: Icon,
      label,
      labelColor = 'info',
      ...rest
    },
    ref
  ) {
    const id = useId()
    const { isCollapsed } = useSidebarContext()
    const { isInsideCollapse } = useSidebarItemContext()
    const inner = (
      <Component
        aria-labelledby={`flowbite-sidebar-item-${id}`}
        ref={ref}
        className={cn(
          t.item.base,
          isActive && t.item.active,
          !isCollapsed && isInsideCollapse && t.item.collapsed.insideCollapse,
          className
        )}
        {...rest}
      >
        {Icon && (
          <Icon
            aria-hidden
            data-testid="flowbite-sidebar-item-icon"
            className={cn(t.item.icon.base, isActive && t.item.icon.active)}
          />
        )}
        {isCollapsed && !Icon && (
          <span className={t.item.collapsed.noIcon}>
            {(typeof children === 'string'
              ? children.charAt(0).toLocaleUpperCase()
              : '') || '?'}
          </span>
        )}
        {!isCollapsed && <ItemContent id={id}>{children}</ItemContent>}
        {!isCollapsed && label && (
          <Badge
            color={labelColor}
            data-testid="flowbite-sidebar-label"
            hidden={isCollapsed}
            className={t.item.label}
          >
            {label}
          </Badge>
        )}
      </Component>
    )
    return (
      <li className={t.item.listItem}>
        {isCollapsed ? (
          <Tooltip
            content={<ItemContent id={id}>{children}</ItemContent>}
            placement="right"
          >
            {inner}
          </Tooltip>
        ) : (
          inner
        )}
      </li>
    )
  }
)

export interface SidebarCollapseProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'label'
> {
  icon?: FC<ComponentPropsWithoutRef<'svg'>>
  label?: string
  chevronIcon?: FC<ComponentPropsWithoutRef<'svg'>>
  renderChevronIcon?: (theme: typeof t.collapse, open: boolean) => ReactNode
  open?: boolean
}

export const SidebarCollapse = forwardRef<HTMLLIElement, SidebarCollapseProps>(
  function SidebarCollapse(
    {
      children,
      className,
      icon: Icon,
      label,
      chevronIcon: ChevronIcon = ChevronDownIcon,
      renderChevronIcon,
      open = false,
      ...rest
    },
    ref
  ) {
    const { isCollapsed } = useSidebarContext()
    const id = useId()
    const [isOpen, setOpen] = useState(open)
    useEffect(() => setOpen(open), [open])

    const body = (
      <>
        <button
          id={`flowbite-sidebar-collapse-${id}`}
          onClick={() => setOpen(!isOpen)}
          title={label}
          type="button"
          className={cn(t.collapse.button, className)}
          {...rest}
        >
          {Icon && (
            <Icon
              aria-hidden
              data-testid="flowbite-sidebar-collapse-icon"
              className={cn(
                t.collapse.icon.base,
                t.collapse.icon.open[isOpen ? 'on' : 'off']
              )}
            />
          )}
          {isCollapsed ? (
            <span className={t.collapse.label.title}>{label}</span>
          ) : (
            <>
              <span
                data-testid="flowbite-sidebar-collapse-label"
                className={t.collapse.label.base}
              >
                {label}
              </span>
              {renderChevronIcon ? (
                renderChevronIcon(t.collapse, isOpen)
              ) : (
                <ChevronIcon
                  aria-hidden
                  className={cn(
                    t.collapse.label.icon.base,
                    t.collapse.label.icon.open[isOpen ? 'on' : 'off']
                  )}
                />
              )}
            </>
          )}
        </button>
        <ul
          aria-labelledby={`flowbite-sidebar-collapse-${id}`}
          hidden={!isOpen}
          className={t.collapse.list}
        >
          <SidebarItemContext.Provider value={{ isInsideCollapse: true }}>
            {children}
          </SidebarItemContext.Provider>
        </ul>
      </>
    )
    return (
      <li ref={ref}>
        {isCollapsed && !isOpen ? (
          <Tooltip content={label} placement="right">
            {body}
          </Tooltip>
        ) : (
          body
        )}
      </li>
    )
  }
)

export const Sidebar = Object.assign(SidebarRoot, {
  Items: SidebarItems,
  ItemGroup: SidebarItemGroup,
  Item: SidebarItem,
  Collapse: SidebarCollapse,
})
