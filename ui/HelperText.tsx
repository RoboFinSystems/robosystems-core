'use client'

import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from './cn'
import { themeDefaults } from './theme-defaults'
import type { DynamicStringEnumKeysOf } from './types'

const t = themeDefaults.helperText

export interface HelperTextProps extends Omit<
  ComponentPropsWithoutRef<'p'>,
  'color'
> {
  color?: DynamicStringEnumKeysOf<typeof t.root.colors>
}

export const HelperText = forwardRef<HTMLParagraphElement, HelperTextProps>(
  function HelperText({ className, color = 'gray', ...rest }, ref) {
    return (
      <p
        ref={ref}
        className={cn(
          t.root.base,
          t.root.colors[color as keyof typeof t.root.colors],
          className
        )}
        {...rest}
      />
    )
  }
)
