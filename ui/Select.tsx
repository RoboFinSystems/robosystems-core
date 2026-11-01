'use client'

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type FC,
  type ReactNode,
} from 'react'
import { cn } from './cn'
import { themeDefaults } from './theme-defaults'
import type { DynamicStringEnumKeysOf } from './types'

const t = themeDefaults.select

export interface SelectProps extends Omit<
  ComponentPropsWithoutRef<'select'>,
  'color'
> {
  addon?: ReactNode
  color?: DynamicStringEnumKeysOf<typeof t.field.select.colors>
  icon?: FC<ComponentPropsWithoutRef<'svg'>>
  shadow?: boolean
  sizing?: DynamicStringEnumKeysOf<typeof t.field.select.sizes>
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      addon,
      className,
      color = 'gray',
      icon: Icon,
      shadow,
      sizing = 'md',
      ...rest
    },
    ref
  ) {
    return (
      <div className={cn(t.base, className)}>
        {addon && <span className={t.addon}>{addon}</span>}
        <div className={t.field.base}>
          {Icon && (
            <div className={t.field.icon.base}>
              <Icon className={t.field.icon.svg} />
            </div>
          )}
          <select
            ref={ref}
            className={cn(
              t.field.select.base,
              t.field.select.colors[
                color as keyof typeof t.field.select.colors
              ],
              t.field.select.sizes[sizing as keyof typeof t.field.select.sizes],
              t.field.select.withIcon[Icon ? 'on' : 'off'],
              t.field.select.withAddon[addon ? 'on' : 'off'],
              t.field.select.withShadow[shadow ? 'on' : 'off']
            )}
            {...rest}
          />
        </div>
      </div>
    )
  }
)
