'use client'

import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from './cn'
import { themeDefaults } from './theme-defaults'
import type { DynamicStringEnumKeysOf } from './types'

const t = themeDefaults.checkbox

export type CheckboxColor = DynamicStringEnumKeysOf<typeof t.color>

export interface CheckboxProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'type' | 'color'
> {
  color?: CheckboxColor
  indeterminate?: boolean
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    { className, color = 'default', indeterminate, ...rest },
    ref
  ) {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          t.base,
          t.color[color as keyof typeof t.color],
          indeterminate && t.indeterminate,
          className
        )}
        {...rest}
      />
    )
  }
)
