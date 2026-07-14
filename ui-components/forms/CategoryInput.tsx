'use client'

import { TextInput } from 'flowbite-react'
import { useState } from 'react'

export interface CategoryInputProps {
  /** Controlled value — always freeform; suggestions are conveniences. */
  value: string
  onChange: (value: string) => void
  /**
   * Suggestion pool (presets and/or observed values). All are shown on
   * focus; typing filters them case-insensitively.
   */
  suggestions?: string[]
  placeholder?: string
  id?: string
  sizing?: 'sm' | 'md'
  disabled?: boolean
  /** Width control, e.g. 'w-40'. */
  className?: string
  'aria-label'?: string
}

const MAX_VISIBLE_SUGGESTIONS = 8

/**
 * Freeform combobox for single-value categorization (document folder,
 * memory type). Suggestions open on focus and filter as the user types;
 * ArrowUp/ArrowDown + Enter or click selects one, Escape closes, and any
 * typed value is accepted as-is.
 */
export function CategoryInput({
  value,
  onChange,
  suggestions,
  placeholder,
  id,
  sizing = 'sm',
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: CategoryInputProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const query = value.trim().toLowerCase()
  const visibleSuggestions = (suggestions ?? [])
    .filter((s) => !query || s.toLowerCase().includes(query))
    .slice(0, MAX_VISIBLE_SUGGESTIONS)
  const showSuggestions = open && !disabled && visibleSuggestions.length > 0

  const select = (suggestion: string) => {
    onChange(suggestion)
    setOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) {
      if (e.key === 'Enter') e.preventDefault()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % visibleSuggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? visibleSuggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      // Never submits a surrounding form; with no active item it just closes.
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < visibleSuggestions.length) {
        select(visibleSuggestions[activeIndex])
      } else {
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <TextInput
        id={id}
        sizing={sizing}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActiveIndex(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          setActiveIndex(-1)
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={showSuggestions}
        aria-label={ariaLabel}
        autoComplete="off"
      />
      {showSuggestions && (
        <ul
          role="listbox"
          aria-label="Suggestions"
          className="absolute z-10 mt-1 min-w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {visibleSuggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              role="option"
              aria-selected={index === activeIndex}
            >
              <button
                type="button"
                className={`w-full px-3 py-1.5 text-left text-sm ${
                  index === activeIndex
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                }`}
                // onMouseDown so selection wins over the input's blur.
                onMouseDown={(e) => {
                  e.preventDefault()
                  select(suggestion)
                }}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
