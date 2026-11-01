'use client'

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type FC,
  type ReactNode,
} from 'react'
import { cn } from './cn'
import { XIcon } from './icons'
import { mergeTheme, type DeepPartial } from './merge-theme'
import { themeDefaults } from './theme-defaults'
import type { DynamicStringEnumKeysOf } from './types'

const defaults = themeDefaults.alert
export type AlertTheme = DeepPartial<typeof defaults>

export type AlertColor = DynamicStringEnumKeysOf<typeof defaults.color>

export interface AlertProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'color'
> {
  additionalContent?: ReactNode
  color?: AlertColor
  icon?: FC<ComponentPropsWithoutRef<'svg'>>
  onDismiss?: () => void
  rounded?: boolean
  withBorderAccent?: boolean
  /** Per-call override merged over the defaults (strings merge with cn). */
  theme?: AlertTheme
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    additionalContent,
    children,
    className,
    color = 'info',
    icon: Icon,
    onDismiss,
    rounded = true,
    withBorderAccent,
    theme,
    ...rest
  },
  ref
) {
  const t = mergeTheme(defaults, theme)
  return (
    <div
      ref={ref}
      className={cn(
        t.base,
        t.color[color as keyof typeof defaults.color],
        rounded && t.rounded,
        withBorderAccent && t.borderAccent,
        className
      )}
      role="alert"
      {...rest}
    >
      <div className={t.wrapper} data-testid="flowbite-alert-wrapper">
        {Icon && <Icon className={t.icon} data-testid="flowbite-alert-icon" />}
        <div>{children}</div>
        {typeof onDismiss === 'function' && (
          <button
            aria-label="Dismiss"
            className={cn(
              t.closeButton.base,
              t.closeButton.color[
                color as keyof typeof defaults.closeButton.color
              ]
            )}
            onClick={onDismiss}
            type="button"
          >
            <XIcon aria-hidden className={t.closeButton.icon} />
          </button>
        )}
      </div>
      {additionalContent && <div>{additionalContent}</div>}
    </div>
  )
})
