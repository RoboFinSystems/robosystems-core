'use client'

import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from './cn'
import { themeDefaults } from './theme-defaults'
import type { DynamicStringEnumKeysOf } from './types'

const t = themeDefaults.radio

export type RadioColor = DynamicStringEnumKeysOf<typeof t.color>

export interface RadioProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'type' | 'color'
> {
  color?: RadioColor
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { color = 'default', className, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      type="radio"
      className={cn(t.base, t.color[color as keyof typeof t.color], className)}
      {...rest}
    />
  )
})
