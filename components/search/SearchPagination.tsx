'use client'

import { Button } from 'flowbite-react'

export interface SearchPaginationProps {
  total: number
  offset: number
  pageSize: number
  loading?: boolean
  /** Receives the new offset — the caller re-runs its search. */
  onPageChange: (newOffset: number) => void
}

/**
 * Previous / "Page X of Y" / Next pagination for offset-based search
 * results. Renders nothing when everything fits on one page.
 */
export function SearchPagination({
  total,
  offset,
  pageSize,
  loading = false,
  onPageChange,
}: SearchPaginationProps) {
  if (total <= pageSize) return null

  return (
    <div className="flex items-center justify-between pt-2">
      <Button
        color="gray"
        size="sm"
        disabled={offset === 0 || loading}
        onClick={() => onPageChange(Math.max(0, offset - pageSize))}
      >
        Previous
      </Button>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        Page {Math.floor(offset / pageSize) + 1} of{' '}
        {Math.ceil(total / pageSize)}
      </span>
      <Button
        color="gray"
        size="sm"
        disabled={offset + pageSize >= total || loading}
        onClick={() => onPageChange(offset + pageSize)}
      >
        Next
      </Button>
    </div>
  )
}
