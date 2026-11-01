'use client'

import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from './cn'
import { themeDefaults } from './theme-defaults'
import type { DynamicStringEnumKeysOf } from './types'

const t = themeDefaults.textarea

export interface TextareaProps extends Omit<
  ComponentPropsWithoutRef<'textarea'>,
  'color'
> {
  color?: DynamicStringEnumKeysOf<typeof t.colors>
  shadow?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, color = 'gray', shadow, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          t.base,
          t.colors[color as keyof typeof t.colors],
          t.withShadow[shadow ? 'on' : 'off'],
          className
        )}
        {...rest}
      />
    )
  }
)
