'use client'

import { Button, Spinner, TextInput } from 'flowbite-react'
import { HiSearch, HiX } from 'react-icons/hi'

export interface SearchBarProps {
  query: string
  onQueryChange: (query: string) => void
  /** Invoked by both the Enter key and the search button. */
  onSearch: () => void
  loading?: boolean
  placeholder?: string
  /** Button label — Recall surfaces pass 'Recall'. */
  buttonLabel?: string
  buttonColor?: string
  /** When provided, a gray X clear button renders after the search button. */
  onClear?: () => void
  /** Controls clear-button visibility (e.g. only after a search ran). */
  showClear?: boolean
}

/**
 * The standard search input row: query field + submit button + optional
 * clear button. Shared by the document Search page and the memory Recall
 * panel so the two surfaces stay visually aligned.
 */
export function SearchBar({
  query,
  onQueryChange,
  onSearch,
  loading = false,
  placeholder,
  buttonLabel = 'Search',
  buttonColor = 'purple',
  onClear,
  showClear,
}: SearchBarProps) {
  const clearVisible = onClear ? (showClear ?? true) : false

  return (
    <div className="flex gap-2">
      <TextInput
        className="flex-1"
        icon={HiSearch}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch()
        }}
        placeholder={placeholder}
      />
      <Button
        color={buttonColor}
        onClick={onSearch}
        disabled={loading || !query.trim()}
      >
        {loading ? <Spinner size="sm" className="text-white" /> : buttonLabel}
      </Button>
      {clearVisible && (
        <Button color="gray" onClick={onClear} aria-label="Clear search">
          <HiX className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
