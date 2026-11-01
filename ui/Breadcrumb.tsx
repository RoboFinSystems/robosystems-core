'use client'

import { forwardRef, type ComponentPropsWithoutRef, type FC } from 'react'
import { cn } from './cn'
import { ChevronRightIcon } from './icons'
import { themeDefaults } from './theme-defaults'

const t = themeDefaults.breadcrumb

export type BreadcrumbProps = ComponentPropsWithoutRef<'nav'>

const BreadcrumbRoot = forwardRef<HTMLElement, BreadcrumbProps>(
  function Breadcrumb({ children, className, ...rest }, ref) {
    return (
      <nav
        ref={ref}
        aria-label="Breadcrumb"
        className={cn(t.root.base, className)}
        {...rest}
      >
        <ol className={t.root.list}>{children}</ol>
      </nav>
    )
  }
)

export interface BreadcrumbItemProps extends ComponentPropsWithoutRef<'li'> {
  href?: string
  icon?: FC<ComponentPropsWithoutRef<'svg'>>
}

export const BreadcrumbItem = forwardRef<
  HTMLAnchorElement | HTMLSpanElement,
  BreadcrumbItemProps
>(function BreadcrumbItem(
  { children, className, href, icon: Icon, ...rest },
  ref
) {
  const isLink = typeof href !== 'undefined'
  const Component = isLink ? 'a' : 'span'
  return (
    <li className={cn(t.item.base, className)} {...rest}>
      <ChevronRightIcon
        aria-hidden
        className={t.item.chevron}
        data-testid="flowbite-breadcrumb-separator"
      />
      <Component
        ref={ref as never}
        className={t.item.href[isLink ? 'on' : 'off']}
        data-testid="flowbite-breadcrumb-item"
        href={href}
      >
        {Icon && <Icon aria-hidden className={t.item.icon} />}
        {children}
      </Component>
    </li>
  )
})

export const Breadcrumb = Object.assign(BreadcrumbRoot, {
  Item: BreadcrumbItem,
})
