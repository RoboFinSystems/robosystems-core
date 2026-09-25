// A failed subscription read against the real @robosystems/client must not
// render as "no subscriptions".
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { json, stubFetch, type FetchStub } from '../../../test/sdk-fetch'

vi.mock('../../../contexts/org-context', () => ({
  useOrg: () => ({ currentOrg: { id: 'org_1' } }),
}))
vi.mock('../../../contexts/service-offerings-context', () => ({
  useServiceOfferings: () => ({
    offerings: {
      repositoryPlans: {
        sec: {
          enabled: true,
          name: 'SEC',
          description: 'SEC filings',
          plans: [{ plan: 'sec-starter', name: 'Starter', monthlyPrice: 10 }],
        },
      },
    },
    isLoading: false,
  }),
}))
vi.mock('../../../contexts/graph-context', () => ({
  useGraphContext: () => ({
    setCurrentGraph: vi.fn(),
    refreshGraphs: vi.fn(),
  }),
}))

import { ActiveSubscriptions } from '../ActiveSubscriptions'
import { BrowseRepositories } from '../BrowseRepositories'

let net: FetchStub
beforeEach(() => {
  net = stubFetch(() => json(503, { detail: 'Service Unavailable' }))
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('subscription list failures', () => {
  it('ActiveSubscriptions shows the error, not the empty state', async () => {
    render(<ActiveSubscriptions emptyState={<p>No subscriptions yet</p>} />)
    await waitFor(() =>
      expect(
        screen.getAllByText(/Failed to load subscriptions/).length
      ).toBeGreaterThan(0)
    )
    expect(screen.queryByText('No subscriptions yet')).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeInTheDocument()
    expect(net.requests('GET', '/subscriptions').length).toBeGreaterThan(0)
  })

  it('BrowseRepositories offers no Subscribe while it cannot tell what the org holds', async () => {
    render(<BrowseRepositories />)
    await waitFor(() =>
      expect(
        screen.getAllByText(/Failed to load subscriptions/).length
      ).toBeGreaterThan(0)
    )
    expect(screen.queryByRole('button', { name: /Subscribe/ })).toBeNull()
  })
})
