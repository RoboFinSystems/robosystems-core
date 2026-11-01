'use client'

import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from './cn'
import { themeDefaults } from './theme-defaults'
import type { DynamicStringEnumKeysOf } from './types'

const t = themeDefaults.label

export interface LabelProps extends Omit<
  ComponentPropsWithoutRef<'label'>,
  'color'
> {
  color?: DynamicStringEnumKeysOf<typeof t.root.colors>
  disabled?: boolean
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { className, color = 'default', disabled = false, ...rest },
  ref
) {
  return (
    <label
      ref={ref}
      className={cn(
        t.root.base,
        t.root.colors[color as keyof typeof t.root.colors],
        disabled && t.root.disabled,
        className
      )}
      data-testid="flowbite-label"
      {...rest}
    />
  )
})
