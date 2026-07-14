'use client'

import { Badge, TextInput } from 'flowbite-react'
import { useState } from 'react'
import { HiX } from 'react-icons/hi'

export interface TagInputProps {
  /** Controlled tag list. */
  tags: string[]
  onChange: (tags: string[]) => void
  /**
   * Suggestion pool (e.g. tags observed elsewhere in the list). Filtered
   * case-insensitively against the draft input, minus already-added tags.
   */
  suggestions?: string[]
  /** flowbite Badge color for the tag chips. */
  badgeColor?: string
  placeholder?: string
  id?: string
  disabled?: boolean
  /** Class for the inline draft input — callers control its width. */
  inputClassName?: string
  'aria-label'?: string
}

const MAX_VISIBLE_SUGGESTIONS = 8

/**
 * Chips-style tag editor. Enter or comma commits the draft (trimmed,
 * lowercased, deduped); Backspace on an empty draft removes the last tag.
 * Pasted comma-separated text is split into individual tags. An optional
 * suggestion listbox opens while the input is focused.
 */
export function TagInput({
  tags,
  onChange,
  suggestions,
  badgeColor = 'purple',
  placeholder = 'Add tag, press Enter',
  id,
  disabled = false,
  inputClassName = 'w-44',
  'aria-label': ariaLabel,
}: TagInputProps) {
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)

  const normalize = (value: string) => value.trim().toLowerCase()

  const commitValues = (values: string[]) => {
    const next = [...tags]
    for (const value of values) {
      const normalized = normalize(value)
      if (normalized && !next.includes(normalized)) {
        next.push(normalized)
      }
    }
    if (next.length !== tags.length) {
      onChange(next)
    }
  }

  const handleDraftChange = (value: string) => {
    // Pasted "a, b, c" — commit every complete segment, keep the tail as draft.
    if (value.includes(',')) {
      const segments = value.split(',')
      const tail = segments.pop() ?? ''
      commitValues(segments)
      setDraft(tail)
    } else {
      setDraft(value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitValues([draft])
      setDraft('')
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    } else if (e.key === 'Escape') {
      setFocused(false)
    }
  }

  const draftNormalized = normalize(draft)
  const visibleSuggestions = (suggestions ?? [])
    .filter(
      (s) =>
        !tags.includes(normalize(s)) &&
        (!draftNormalized || s.toLowerCase().includes(draftNormalized))
    )
    .slice(0, MAX_VISIBLE_SUGGESTIONS)
  const showSuggestions = focused && !disabled && visibleSuggestions.length > 0

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <Badge key={tag} color={badgeColor} size="sm">
          <span className="flex items-center gap-1">
            {tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              disabled={disabled}
              onClick={() => onChange(tags.filter((t) => t !== tag))}
            >
              <HiX className="h-3 w-3" />
            </button>
          </span>
        </Badge>
      ))}
      <div className="relative">
        <TextInput
          id={id}
          sizing="sm"
          value={draft}
          disabled={disabled}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className={inputClassName}
          aria-label={ariaLabel ?? 'Add tag'}
          role="combobox"
          aria-expanded={showSuggestions}
          autoComplete="off"
        />
        {showSuggestions && (
          <ul
            role="listbox"
            aria-label="Tag suggestions"
            className="absolute z-10 mt-1 min-w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            {visibleSuggestions.map((suggestion) => (
              <li key={suggestion} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  // onMouseDown so selection wins over the input's blur.
                  onMouseDown={(e) => {
                    e.preventDefault()
                    commitValues([suggestion])
                    setDraft('')
                  }}
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
