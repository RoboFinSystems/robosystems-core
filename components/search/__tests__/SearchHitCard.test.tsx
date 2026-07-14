import type { SearchHit } from '@robosystems/client'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SearchHitCard } from '../SearchHitCard'

const FULL_HIT: SearchHit = {
  document_id: 'doc-1',
  document_title: 'Annual Report',
  section_label: 'Risk Factors',
  source_type: 'narrative_section',
  entity_ticker: 'NVDA',
  form_type: '10-K',
  fiscal_year: 2024,
  tags: ['ai', 'risk'],
  score: 0.8734,
  snippet: 'The company faces risks...',
} as SearchHit

describe('SearchHitCard', () => {
  it('renders the full badge row for an SEC-style hit', () => {
    render(<SearchHitCard hit={FULL_HIT} />)
    expect(screen.getByText('0.87')).toBeInTheDocument()
    expect(screen.getByText('narrative_section')).toBeInTheDocument()
    expect(screen.getByText('NVDA')).toBeInTheDocument()
    expect(screen.getByText('10-K')).toBeInTheDocument()
    expect(screen.getByText('FY2024')).toBeInTheDocument()
    expect(screen.getByText('ai')).toBeInTheDocument()
    expect(screen.getByText('risk')).toBeInTheDocument()
    expect(screen.getByText('The company faces risks...')).toBeInTheDocument()
  })

  it('renders title with section label suffix', () => {
    render(<SearchHitCard hit={FULL_HIT} />)
    expect(screen.getByText('Annual Report')).toBeInTheDocument()
    expect(screen.getByText('/ Risk Factors')).toBeInTheDocument()
  })

  it('falls back to the section label, then Untitled', () => {
    render(
      <SearchHitCard
        hit={{ ...FULL_HIT, document_title: undefined } as SearchHit}
      />
    )
    expect(screen.getByText('Risk Factors')).toBeInTheDocument()

    render(
      <SearchHitCard
        hit={
          {
            ...FULL_HIT,
            document_title: undefined,
            section_label: undefined,
          } as SearchHit
        }
      />
    )
    expect(screen.getByText('Untitled')).toBeInTheDocument()
  })

  it('hides the title row and source type for recall-style hits', () => {
    render(
      <SearchHitCard hit={FULL_HIT} showTitle={false} showSourceType={false} />
    )
    expect(screen.queryByText('Annual Report')).toBeNull()
    expect(screen.queryByText('narrative_section')).toBeNull()
    expect(screen.getByText('0.87')).toBeInTheDocument()
  })

  it('renders no expand affordance when expanded is undefined', () => {
    render(<SearchHitCard hit={FULL_HIT} />)
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-expanded')
  })

  it('renders the chevron and expanded children when expandable', () => {
    const { rerender } = render(
      <SearchHitCard hit={FULL_HIT} expanded={false}>
        <p>Section content</p>
      </SearchHitCard>
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Section content')).toBeNull()

    rerender(
      <SearchHitCard hit={FULL_HIT} expanded>
        <p>Section content</p>
      </SearchHitCard>
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Section content')).toBeInTheDocument()
  })

  it('invokes onClick when the card body is activated', () => {
    const onClick = vi.fn()
    render(<SearchHitCard hit={FULL_HIT} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
