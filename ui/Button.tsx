'use client'

import {
  createElement,
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from 'react'
import { cn } from './cn'
import { themeDefaults } from './theme-defaults'
import type { DynamicStringEnumKeysOf } from './types'

const t = themeDefaults.button

export type ButtonColor = DynamicStringEnumKeysOf<typeof t.color>
export type ButtonSize = DynamicStringEnumKeysOf<typeof t.size>

export interface ButtonProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'color'
> {
  /** Render as another element or component (e.g. Next's Link). */
  as?: ElementType
  href?: string
  color?: ButtonColor
  size?: ButtonSize
  outline?: boolean
  pill?: boolean
  fullSized?: boolean
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      className,
      color = 'default',
      disabled,
      fullSized,
      outline,
      pill,
      size = 'md',
      as: Component,
      href,
      type = 'button',
      ...rest
    },
    ref
  ) {
    const Base = Component ?? (href ? 'a' : 'button')
    return createElement(
      Base,
      {
        ref,
        href,
        type,
        disabled,
        className: cn(
          t.base,
          t.size[size as keyof typeof t.size],
          pill && t.pill,
          disabled && t.disabled,
          fullSized && t.fullSized,
          outline
            ? t.outlineColor[color as keyof typeof t.outlineColor]
            : t.color[color as keyof typeof t.color],
          className
        ),
        ...rest,
      },
      children
    )
  }
)
