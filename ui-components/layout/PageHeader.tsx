'use client'

import type { ComponentType, ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

export interface PageHeaderProps {
  /**
   * Icon rendered in white on the brand-gradient chip — typically a
   * react-icons `Hi*` component, e.g. `icon={HiHome}`.
   */
  icon: ComponentType<{ className?: string }>
  title: string
  subtitle?: ReactNode
  /** Optional right-aligned content (buttons, menus). */
  actions?: ReactNode
  /** Extra classes on the outer wrapper, e.g. `mb-6`. */
  className?: string
}

/**
 * The standard page header used across the authenticated app: a white icon on
 * the app's brand-gradient chip, a title, an optional subtitle, and optional
 * right-aligned actions. The gradient spans the brand `primary` → `secondary`
 * → `accent` tokens, so it reskins to each app automatically.
 *
 * Below `sm` the actions drop onto their own row under the title rather than
 * competing with it for a 390px-wide line — a row of buttons that cannot fit
 * beside the title is what used to push the whole page into a horizontal
 * scroll. Above `sm` they return to the right edge. `min-w-0` on the title
 * column is what lets a long title shrink instead of shoving the actions off
 * the viewport, since a flex item's default `min-width: auto` refuses to.
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={twMerge(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="from-primary-500 via-secondary-500 to-accent-500 shrink-0 rounded-lg bg-gradient-to-br p-2.5 sm:p-3">
          <Icon className="h-6 w-6 text-white sm:h-8 sm:w-8" />
        </div>
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold break-words text-gray-900 sm:text-3xl dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <div className="mt-1 text-sm break-words text-gray-500 dark:text-gray-400">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 sm:shrink-0">{actions}</div>
      )}
    </div>
  )
}
