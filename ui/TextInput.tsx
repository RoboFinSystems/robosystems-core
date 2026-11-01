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

const t = themeDefaults.textInput

export interface TextInputProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'color'
> {
  addon?: ReactNode
  color?: DynamicStringEnumKeysOf<typeof t.field.input.colors>
  icon?: FC<ComponentPropsWithoutRef<'svg'>>
  rightIcon?: FC<ComponentPropsWithoutRef<'svg'>>
  shadow?: boolean
  sizing?: DynamicStringEnumKeysOf<typeof t.field.input.sizes>
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput(
    {
      addon,
      className,
      color = 'gray',
      icon: Icon,
      rightIcon: RightIcon,
      shadow,
      sizing = 'md',
      type = 'text',
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
          {RightIcon && (
            <div data-testid="right-icon" className={t.field.rightIcon.base}>
              <RightIcon className={t.field.rightIcon.svg} />
            </div>
          )}
          <input
            className={cn(
              t.field.input.base,
              t.field.input.colors[color as keyof typeof t.field.input.colors],
              t.field.input.sizes[sizing as keyof typeof t.field.input.sizes],
              t.field.input.withIcon[Icon ? 'on' : 'off'],
              t.field.input.withRightIcon[RightIcon ? 'on' : 'off'],
              t.field.input.withAddon[addon ? 'on' : 'off'],
              t.field.input.withShadow[shadow ? 'on' : 'off']
            )}
            type={type}
            {...rest}
            ref={ref}
          />
        </div>
      </div>
    )
  }
)
