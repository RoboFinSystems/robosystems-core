import type { ReactNode } from 'react'

export interface SearchResultsMetaProps {
  total: number
  /** Hits rendered on the current page. */
  count: number
  offset?: number
  query: string
  /** Overrides the default copy (Recall supplies its own phrasing). */
  children?: ReactNode
}

/**
 * The results-summary line above a search hit list. Default copy is the
 * Search page's "Showing X–Y of N results for "q""; pass children for
 * surface-specific phrasing.
 */
export function SearchResultsMeta({
  total,
  count,
  offset = 0,
  query,
  children,
}: SearchResultsMetaProps) {
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400">
      {children ?? (
        <>
          Showing {offset + 1}&ndash;{Math.min(offset + count, total)} of{' '}
          {total} results for &quot;{query}&quot;
        </>
      )}
    </p>
  )
}
