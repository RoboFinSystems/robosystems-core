// Search responses that land after the graph changed, against the real
// @robosystems/client.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { json, stubFetch, type FetchStub } from '../../../test/sdk-fetch'

let currentGraphId = 'kgA'
vi.mock('../../../contexts', () => ({
  useGraphContext: () => ({ state: { currentGraphId } }),
}))
vi.mock('../../RepositoryGuard', () => ({
  useIsRepository: () => ({ isRepository: false }),
}))

import { SearchContent } from '../SearchContent'

const CONFIG = {
  title: 'Document Search',
  description: 'Search documents',
  placeholder: 'Search documents...',
}

const hit = (title: string) => ({
  document_id: `doc-${title}`,
  document_title: title,
  section_label: null,
  source_type: 'uploaded_doc',
  entity_ticker: null,
  form_type: null,
  fiscal_year: null,
  tags: [],
  score: 0.9,
  snippet: `${title} snippet`,
})

let net: FetchStub
let releaseA: () => void = () => undefined
beforeEach(() => {
  currentGraphId = 'kgA'
  net = stubFetch((req) => {
    if (req.url.includes('/search')) {
      const graph = req.url.includes('/kgA/') ? 'kgA' : 'kgB'
      const body = json(200, {
        hits: [hit(`Policy on ${graph}`)],
        total: 1,
        query: 'policy',
      })
      if (graph === 'kgA') {
        return new Promise<Response>((resolve) => {
          releaseA = () => resolve(body)
        })
      }
      return body
    }
    return json(200, { documents: [], total: 0 })
  })
})

describe('SearchContent across a graph switch', () => {
  it("drops the previous graph's results when they land late", async () => {
    const { rerender } = render(<SearchContent config={CONFIG} />)
    fireEvent.change(screen.getByPlaceholderText(/Search/), {
      target: { value: 'policy' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() =>
      expect(net.requests('POST', '/kgA/').length).toBeGreaterThan(0)
    )

    currentGraphId = 'kgB'
    rerender(<SearchContent config={CONFIG} />)
    releaseA()
    await new Promise((r) => setTimeout(r, 30))

    expect(screen.queryByText('Policy on kgA')).toBeNull()
  })
})
