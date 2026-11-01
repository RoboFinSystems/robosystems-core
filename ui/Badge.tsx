'use client'

import { forwardRef, type ComponentPropsWithoutRef, type FC } from 'react'
import { cn } from './cn'
import { themeDefaults } from './theme-defaults'
import type { DynamicStringEnumKeysOf } from './types'

const t = themeDefaults.badge

export type BadgeColor = DynamicStringEnumKeysOf<typeof t.root.color>
export type BadgeSize = DynamicStringEnumKeysOf<typeof t.root.size>

export interface BadgeProps extends Omit<
  ComponentPropsWithoutRef<'span'>,
  'color'
> {
  color?: BadgeColor
  size?: BadgeSize
  icon?: FC<ComponentPropsWithoutRef<'svg'>>
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { children, color = 'info', icon: Icon, size = 'xs', className, ...rest },
  ref
) {
  return (
    <span
      ref={ref}
      className={cn(
        t.root.base,
        t.root.color[color as keyof typeof t.root.color],
        t.root.size[size as keyof typeof t.root.size],
        t.icon[Icon ? 'on' : 'off'],
        className
      )}
      data-testid="flowbite-badge"
      {...rest}
    >
      {Icon && (
        <Icon
          aria-hidden
          className={t.icon.size[size as keyof typeof t.icon.size]}
          data-testid="flowbite-badge-icon"
        />
      )}
      {children && <span>{children}</span>}
    </span>
  )
})
