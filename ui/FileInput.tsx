'use client'

import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from './cn'
import { themeDefaults } from './theme-defaults'
import type { DynamicStringEnumKeysOf } from './types'

const t = themeDefaults.fileInput

export interface FileInputProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'type' | 'color'
> {
  color?: DynamicStringEnumKeysOf<typeof t.colors>
  sizing?: DynamicStringEnumKeysOf<typeof t.sizes>
}

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  function FileInput(
    { className, color = 'gray', sizing = 'md', ...rest },
    ref
  ) {
    return (
      <input
        ref={ref}
        type="file"
        className={cn(
          t.base,
          t.colors[color as keyof typeof t.colors],
          t.sizes[sizing as keyof typeof t.sizes],
          className
        )}
        {...rest}
      />
    )
  }
)
