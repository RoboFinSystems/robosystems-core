'use client'

import type { SearchHit } from '@robosystems/client'
import { Badge, Card } from 'flowbite-react'
import type { ReactNode } from 'react'
import { HiChevronDown, HiChevronUp } from 'react-icons/hi'

export interface SearchHitCardProps {
  hit: SearchHit
  /** Card activation — Search toggles expansion; Recall opens the memory. */
  onClick?: () => void
  /**
   * Expansion state. Leave undefined for surfaces without an expand
   * affordance (no chevron is rendered).
   */
  expanded?: boolean
  /** Title row (document/section). Recall hits are title-less. */
  showTitle?: boolean
  showSourceType?: boolean
  tagBadgeColor?: string
  /** Expanded region, rendered under a top border when `expanded` is true. */
  children?: ReactNode
}

/**
 * The standard scored-search-result card: title row, badge row (score,
 * source type, entity, form, fiscal year, tags), snippet, and an optional
 * expandable region. Shared by the document Search page and the memory
 * Recall panel.
 */
export function SearchHitCard({
  hit,
  onClick,
  expanded,
  showTitle = true,
  showSourceType = true,
  tagBadgeColor = 'purple',
  children,
}: SearchHitCardProps) {
  const expandable = expanded !== undefined

  return (
    <Card>
      <button
        type="button"
        className="w-full cursor-pointer text-left"
        onClick={onClick}
        aria-expanded={expandable ? expanded : undefined}
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            {showTitle && (
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {hit.document_title || hit.section_label || 'Untitled'}
                </h3>
                {hit.section_label && hit.document_title && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    / {hit.section_label}
                  </span>
                )}
              </div>
            )}

            <div
              className={`flex flex-wrap items-center gap-2 ${showTitle ? 'mt-2' : ''}`}
            >
              <Badge color="info" size="xs">
                {hit.score.toFixed(2)}
              </Badge>
              {showSourceType && (
                <Badge color="gray" size="xs">
                  {hit.source_type}
                </Badge>
              )}
              {hit.entity_ticker && (
                <Badge color="purple" size="xs">
                  {hit.entity_ticker}
                </Badge>
              )}
              {hit.form_type && (
                <Badge color="warning" size="xs">
                  {hit.form_type}
                </Badge>
              )}
              {hit.fiscal_year && (
                <Badge color="gray" size="xs">
                  FY{hit.fiscal_year}
                </Badge>
              )}
              {hit.tags?.map((tag) => (
                <Badge key={tag} color={tagBadgeColor} size="xs">
                  {tag}
                </Badge>
              ))}
            </div>

            {hit.snippet && (
              <p className="mt-3 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                {hit.snippet}
              </p>
            )}
          </div>

          {expandable && (
            <div className="ml-3 shrink-0 pt-1">
              {expanded ? (
                <HiChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <HiChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
          )}
        </div>
      </button>

      {expanded && children && (
        <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
          {children}
        </div>
      )}
    </Card>
  )
}
