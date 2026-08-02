import type { ComponentType, ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

interface EmptyStateProps {
  /** Icon shown above the title — typically a react-icons `Hi*` component. */
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>
  title: string
  /** Supporting copy below the title. Inline content only (rendered in a block). */
  description?: ReactNode
  /** Optional call-to-action (e.g. a "Create…" button) shown below. */
  action?: ReactNode
  /** Override the container spacing (default `py-12`). */
  className?: string
  /**
   * Heading level for the title. Defaults to `2`, which is correct when the
   * empty state sits directly inside a page whose title is the `<h1>` — the
   * common case. Pass `3` (or deeper) when it is nested under a section that
   * already has its own heading, so the document outline stays contiguous.
   */
  headingLevel?: 2 | 3 | 4
}

/**
 * The shared empty state: a muted icon, a title, an optional description, and an
 * optional action — centered. Render it inside whatever container the page uses
 * (often a `<Card>`); this component is just the centered inner block.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  headingLevel = 2,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4'

  return (
    <div className={twMerge('py-12 text-center', className)}>
      <Icon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
      <Heading className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
        {title}
      </Heading>
      {description && (
        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {description}
        </div>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
