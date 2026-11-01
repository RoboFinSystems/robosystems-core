'use client'

import { forwardRef, useId, type ComponentPropsWithoutRef } from 'react'
import { cn } from './cn'
import { themeDefaults } from './theme-defaults'
import type { DynamicStringEnumKeysOf } from './types'

const t = themeDefaults.progress

export interface ProgressProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'color'
> {
  color?: DynamicStringEnumKeysOf<typeof t.color>
  labelProgress?: boolean
  labelText?: boolean
  progress: number
  progressLabelPosition?: 'inside' | 'outside'
  size?: DynamicStringEnumKeysOf<typeof t.size>
  textLabel?: string
  textLabelPosition?: 'inside' | 'outside'
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  function Progress(
    {
      className,
      color = 'default',
      labelProgress = false,
      labelText = false,
      progress,
      progressLabelPosition = 'inside',
      size = 'md',
      textLabel = 'progressbar',
      textLabelPosition = 'inside',
      ...rest
    },
    ref
  ) {
    const id = useId()
    const outerText = textLabel && labelText && textLabelPosition === 'outside'
    const outerProgress =
      progress > 0 && labelProgress && progressLabelPosition === 'outside'
    return (
      <div
        ref={ref}
        id={id}
        aria-label={textLabel}
        aria-valuenow={progress}
        role="progressbar"
        {...rest}
      >
        {(outerText || outerProgress) && (
          <div
            className={t.label}
            data-testid="flowbite-progress-outer-label-container"
          >
            {outerText && (
              <span data-testid="flowbite-progress-outer-text-label">
                {textLabel}
              </span>
            )}
            {labelProgress && progressLabelPosition === 'outside' && (
              <span data-testid="flowbite-progress-outer-progress-label">
                {progress}%
              </span>
            )}
          </div>
        )}
        <div
          className={cn(t.base, t.size[size as keyof typeof t.size], className)}
        >
          <div
            style={{ width: `${progress}%` }}
            className={cn(
              t.bar,
              t.color[color as keyof typeof t.color],
              t.size[size as keyof typeof t.size]
            )}
          >
            {textLabel && labelText && textLabelPosition === 'inside' && (
              <span data-testid="flowbite-progress-inner-text-label">
                {textLabel}
              </span>
            )}
            {progress > 0 &&
              labelProgress &&
              progressLabelPosition === 'inside' && (
                <span data-testid="flowbite-progress-inner-progress-label">
                  {progress}%
                </span>
              )}
          </div>
        </div>
      </div>
    )
  }
)
