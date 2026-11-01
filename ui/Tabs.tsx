'use client'

import {
  Children,
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type FC,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import { cn } from './cn'
import { themeDefaults } from './theme-defaults'
import type { DynamicStringEnumKeysOf } from './types'

const t = themeDefaults.tabs

export interface TabItemProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'title'
> {
  active?: boolean
  disabled?: boolean
  icon?: FC<ComponentPropsWithoutRef<'svg'>>
  title: ReactNode
}

/** The tab definition; Tabs reads its props and renders the panel itself. */
export const TabItem = forwardRef<HTMLDivElement, TabItemProps>(
  function TabItem({ title: _title, ...rest }, ref) {
    return <div ref={ref} {...rest} />
  }
)

export interface TabsRef {
  setActiveTab: (activeTab: number) => void
}

export interface TabsProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'ref'
> {
  onActiveTabChange?: (activeTab: number) => void
  variant?: DynamicStringEnumKeysOf<typeof t.tablist.variant>
}

const TabsRoot = forwardRef<TabsRef, TabsProps>(function Tabs(
  { children, className, onActiveTabChange, variant = 'default', ...rest },
  ref
) {
  const id = useId()
  const tabs = useMemo(
    () =>
      Children.map(
        Children.toArray(children) as ReactElement<TabItemProps>[],
        ({ props }) => props
      ) ?? [],
    [children]
  )
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [activeTab, setActiveTab] = useState(
    Math.max(
      0,
      tabs.findIndex((tab) => tab.active)
    )
  )
  const [focusedTab, setFocusedTab] = useState(-1)

  function setActiveTabWithCallback(next: number) {
    setActiveTab(next)
    onActiveTabChange?.(next)
  }
  function handleClick(target: number) {
    setActiveTabWithCallback(target)
    setFocusedTab(target)
  }
  function handleKeyboard(
    event: KeyboardEvent<HTMLButtonElement>,
    target: number
  ) {
    if (event.key === 'ArrowLeft') setFocusedTab(Math.max(0, focusedTab - 1))
    if (event.key === 'ArrowRight')
      setFocusedTab(Math.min(tabs.length - 1, focusedTab + 1))
    if (event.key === 'Enter') {
      setActiveTabWithCallback(target)
      setFocusedTab(target)
    }
  }

  const v = variant as keyof typeof t.tablist.variant
  const tabItemStyle = t.tablist.tabitem.variant[v]
  const tabItemContainerStyle = t.tabitemcontainer.variant[v]

  useEffect(() => {
    tabRefs.current[focusedTab]?.focus()
  }, [focusedTab])

  useImperativeHandle(ref, () => ({ setActiveTab: setActiveTabWithCallback }))

  return (
    <div className={cn(t.base, className)}>
      <div
        aria-label="Tabs"
        role="tablist"
        className={cn(t.tablist.base, t.tablist.variant[v], className)}
        {...rest}
      >
        {tabs.map((tab, index) => (
          <button
            key={index}
            type="button"
            aria-controls={`${id}-tabpanel-${index}`}
            aria-selected={index === activeTab}
            className={cn(
              t.tablist.tabitem.base,
              tabItemStyle.base,
              index === activeTab && tabItemStyle.active.on,
              index !== activeTab && !tab.disabled && tabItemStyle.active.off
            )}
            disabled={tab.disabled}
            id={`${id}-tab-${index}`}
            onClick={() => handleClick(index)}
            onKeyDown={(event) => handleKeyboard(event, index)}
            ref={(element) => {
              tabRefs.current[index] = element
            }}
            role="tab"
            tabIndex={index === focusedTab ? 0 : -1}
            style={{ zIndex: index === focusedTab ? 2 : 1 }}
          >
            {tab.icon && <tab.icon className={t.tablist.tabitem.icon} />}
            {tab.title}
          </button>
        ))}
      </div>
      <div className={cn(t.tabitemcontainer.base, tabItemContainerStyle)}>
        {tabs.map((tab, index) => (
          <div
            key={index}
            aria-labelledby={`${id}-tab-${index}`}
            className={t.tabpanel}
            hidden={index !== activeTab}
            id={`${id}-tabpanel-${index}`}
            role="tabpanel"
            tabIndex={0}
          >
            {tab.children}
          </div>
        ))}
      </div>
    </div>
  )
})

/** Tabs with the `Tabs.Item` alias the apps use. */
export const Tabs = Object.assign(TabsRoot, { Item: TabItem })
