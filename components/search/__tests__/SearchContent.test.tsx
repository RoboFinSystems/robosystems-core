import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SearchConfig } from '../types'

vi.mock('../../../contexts', () => ({
  useGraphContext: vi.fn(),
}))

vi.mock('../../RepositoryGuard', () => ({
  useIsRepository: vi.fn(),
}))

// Import after mocks. The runtime SDK functions come from the aliased
// test/__mocks__/@robosystems/client.js (all vi.fn()).
import * as SDK from '@robosystems/client'
import { useGraphContext } from '../../../contexts'
import { useIsRepository } from '../../RepositoryGuard'
import { SearchContent } from '../SearchContent'

const mockUseGraphContext = vi.mocked(useGraphContext)
const mockUseIsRepository = vi.mocked(useIsRepository)
const mockSearchDocuments = vi.mocked(SDK.searchDocuments)
const mockListDocuments = vi.mocked(SDK.listDocuments)
const mockGetDocumentSection = vi.mocked(SDK.getDocumentSection)

const FULL_CONFIG: SearchConfig = {
  title: 'Document Search',
  description: 'Search indexed documents',
  placeholder: 'Search documents...',
  filters: {
    sourceType: true,
    entity: true,
    formType: true,
    fiscalYear: true,
    semantic: true,
  },
}

const USER_GRAPH_CONFIG: SearchConfig = {
  title: 'Document Search',
  description: 'Search uploaded documents and AI memories',
  placeholder: 'Search your documents...',
  filters: { sourceType: true, semantic: true },
}

function makeHit(overrides: Record<string, unknown> = {}) {
  return {
    document_id: 'doc-1',
    document_title: 'Revenue Policy',
    section_label: null,
    source_type: 'uploaded_doc',
    entity_ticker: null,
    form_type: null,
    fiscal_year: null,
    tags: ['finance'],
    score: 0.91,
    snippet: 'Revenue is recognized when...',
    ...overrides,
  }
}

async function searchFor(query: string) {
  fireEvent.change(screen.getByPlaceholderText(/Search/), {
    target: { value: query },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Search' }))
  await waitFor(() => expect(mockSearchDocuments).toHaveBeenCalled())
}

describe('SearchContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseGraphContext.mockReturnValue({
      state: { currentGraphId: 'kg123' },
    } as ReturnType<typeof useGraphContext>)
    mockUseIsRepository.mockReturnValue({
      isRepository: false,
    } as ReturnType<typeof useIsRepository>)
    mockListDocuments.mockResolvedValue({
      data: { total: 3, documents: [], graph_id: 'kg123' },
    } as never)
    mockSearchDocuments.mockResolvedValue({
      data: {
        hits: [makeHit()],
        total: 1,
        query: 'revenue',
        graph_id: 'kg123',
      },
    } as never)
  })

  it('renders the config title, description, and indexed-document count', async () => {
    render(<SearchContent config={USER_GRAPH_CONFIG} />)
    expect(screen.getByText('Document Search')).toBeInTheDocument()
    expect(
      screen.getByText(/Search uploaded documents and AI memories/)
    ).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Search your documents...')
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText(/3 documents indexed/)).toBeInTheDocument()
    )
  })

  it('prompts for a graph when none is selected', () => {
    mockUseGraphContext.mockReturnValue({
      state: { currentGraphId: null },
    } as ReturnType<typeof useGraphContext>)
    render(<SearchContent config={USER_GRAPH_CONFIG} />)
    expect(
      screen.getByText('Select a graph to search documents.')
    ).toBeInTheDocument()
  })

  it('searches and renders scored hit cards', async () => {
    render(<SearchContent config={USER_GRAPH_CONFIG} />)
    await searchFor('revenue')

    expect(mockSearchDocuments).toHaveBeenCalledWith({
      path: { graph_id: 'kg123' },
      body: { query: 'revenue', size: 20, offset: 0 },
    })
    expect(await screen.findByText('Revenue Policy')).toBeInTheDocument()
    expect(screen.getByText('0.91')).toBeInTheDocument()
    expect(screen.getByText('uploaded_doc')).toBeInTheDocument()
    expect(screen.getByText('finance')).toBeInTheDocument()
    expect(
      screen.getByText(/Showing 1–1 of 1 results for "revenue"/)
    ).toBeInTheDocument()
  })

  it('shows exactly the configured filter controls (sibling-app contract)', () => {
    render(<SearchContent config={USER_GRAPH_CONFIG} />)
    expect(screen.getByText('Semantic search')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    expect(screen.getByLabelText('Source Type')).toBeInTheDocument()
    expect(screen.queryByLabelText('Entity / Ticker')).toBeNull()
    expect(screen.queryByLabelText('Form Type')).toBeNull()
    expect(screen.queryByLabelText('Fiscal Year')).toBeNull()
  })

  it('includes enabled filters in the search body', async () => {
    render(<SearchContent config={FULL_CONFIG} />)

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    fireEvent.change(screen.getByLabelText('Source Type'), {
      target: { value: 'uploaded_doc' },
    })
    fireEvent.change(screen.getByLabelText('Entity / Ticker'), {
      target: { value: 'NVDA' },
    })
    fireEvent.change(screen.getByLabelText('Form Type'), {
      target: { value: '10-K' },
    })
    fireEvent.change(screen.getByLabelText('Fiscal Year'), {
      target: { value: '2024' },
    })
    fireEvent.click(screen.getByText('Semantic search'))

    await searchFor('revenue')

    expect(mockSearchDocuments).toHaveBeenCalledWith({
      path: { graph_id: 'kg123' },
      body: {
        query: 'revenue',
        size: 20,
        offset: 0,
        source_type: 'uploaded_doc',
        entity: 'NVDA',
        form_type: '10-K',
        fiscal_year: 2024,
        semantic: true,
      },
    })
  })

  it('expands a hit and renders its section through the markdown renderer', async () => {
    mockGetDocumentSection.mockResolvedValue({
      data: {
        document_id: 'doc-1',
        graph_id: 'kg123',
        source_type: 'uploaded_doc',
        content: '## Section body',
        content_length: 15,
      },
    } as never)

    render(<SearchContent config={USER_GRAPH_CONFIG} />)
    await searchFor('revenue')

    fireEvent.click(await screen.findByText('Revenue Policy'))
    await waitFor(() =>
      expect(mockGetDocumentSection).toHaveBeenCalledWith({
        path: { graph_id: 'kg123', document_id: 'doc-1' },
      })
    )
    // react-markdown is mocked to render the raw source.
    expect(await screen.findByText('## Section body')).toBeInTheDocument()
    expect(screen.getByText('15 characters')).toBeInTheDocument()
  })

  it('paginates with new offsets', async () => {
    mockSearchDocuments.mockResolvedValue({
      data: {
        hits: Array.from({ length: 20 }, (_, i) =>
          makeHit({ document_id: `doc-${i}`, document_title: `Doc ${i}` })
        ),
        total: 45,
        query: 'revenue',
        graph_id: 'kg123',
      },
    } as never)

    render(<SearchContent config={USER_GRAPH_CONFIG} />)
    await searchFor('revenue')

    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() =>
      expect(mockSearchDocuments).toHaveBeenLastCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ offset: 20 }),
        })
      )
    )
  })

  it('shows the empty state when a search returns nothing', async () => {
    mockSearchDocuments.mockResolvedValue({
      data: { hits: [], total: 0, query: 'nothing', graph_id: 'kg123' },
    } as never)

    render(<SearchContent config={USER_GRAPH_CONFIG} />)
    await searchFor('nothing')

    expect(
      await screen.findByText(/No results found for "nothing"/)
    ).toBeInTheDocument()
  })
})
