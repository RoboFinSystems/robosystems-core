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
          plans: [
            {
              plan: 'sec-starter',
              name: 'Starter',
              monthlyPrice: 10,
              monthlyCredits: 100,
            },
          ],
        },
      },
    },
    isLoading: false,
  }),
}))
vi.mock('../../../hooks/use-user', () => ({
  useUser: () => ({ user: { id: 'user_owner' } }),
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

describe("an owner whose org's only seat is a member's", () => {
  // The API lists every member's row to an owner or admin.
  const membersSeat = () =>
    stubFetch((r) =>
      r.url.includes('/v1/billing/subscriptions/org_1')
        ? json(200, [
            {
              id: 'sub_m',
              resource_type: 'repository',
              resource_id: 'sec',
              user_id: 'user_member',
              plan_name: 'sec-starter',
              plan_display_name: 'Starter',
              billing_interval: 'monthly',
              status: 'active',
              base_price_cents: 1000,
            },
          ])
        : json(200, {})
    )

  it('BrowseRepositories still offers the owner a seat of their own', async () => {
    membersSeat()
    render(<BrowseRepositories />)
    expect(
      await screen.findByRole('button', { name: /Subscribe/ })
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Current Plan/ })).toBeNull()
  })

  it("ActiveSubscriptions does not list the member's seat as the owner's", async () => {
    membersSeat()
    render(<ActiveSubscriptions emptyState={<p>No subscriptions yet</p>} />)
    expect(await screen.findByText('No subscriptions yet')).toBeInTheDocument()
  })
})
